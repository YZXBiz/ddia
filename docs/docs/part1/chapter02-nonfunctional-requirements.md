---
sidebar_position: 2
title: "Chapter 2: Defining Nonfunctional Requirements"
description: "Understanding performance, reliability, scalability, and maintainability in data systems"
---

# Chapter 2. Defining Nonfunctional Requirements

> **"The Internet was done so well that most people think of it as a natural resource like the Pacific Ocean, rather than something that was man-made. When was the last time a technology with a scale like that was so error-free?"**
>
> — Alan Kay, in interview with Dr Dobb's Journal (2012)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Case Study: Social Network Home Timelines](#2-case-study-social-network-home-timelines)
   - 2.1. [Representing Users, Posts, and Follows](#21-representing-users-posts-and-follows)
   - 2.2. [Materializing and Updating Timelines](#22-materializing-and-updating-timelines)
3. [Describing Performance](#3-describing-performance)
   - 3.1. [Latency and Response Time](#31-latency-and-response-time)
   - 3.2. [Average, Median, and Percentiles](#32-average-median-and-percentiles)
   - 3.3. [Use of Response Time Metrics](#33-use-of-response-time-metrics)
4. [Reliability and Fault Tolerance](#4-reliability-and-fault-tolerance)
   - 4.1. [Fault Tolerance](#41-fault-tolerance)
   - 4.2. [Hardware and Software Faults](#42-hardware-and-software-faults)
   - 4.3. [Humans and Reliability](#43-humans-and-reliability)
   - 4.4. [How Important Is Reliability?](#44-how-important-is-reliability)
5. [Scalability](#5-scalability)
   - 5.1. [Describing Load](#51-describing-load)
   - 5.2. [Shared-Memory, Shared-Disk, and Shared-Nothing Architecture](#52-shared-memory-shared-disk-and-shared-nothing-architecture)
   - 5.3. [Principles for Scalability](#53-principles-for-scalability)
6. [Maintainability](#6-maintainability)
   - 6.1. [Operability: Making Life Easy for Operations](#61-operability-making-life-easy-for-operations)
   - 6.2. [Simplicity: Managing Complexity](#62-simplicity-managing-complexity)
   - 6.3. [Evolvability: Making Change Easy](#63-evolvability-making-change-easy)
7. [Summary](#7-summary)

---

## 1. Introduction

If you are building an application, you will be driven by a list of requirements. At the top of your list is most likely the functionality that the application must offer: what screens and what buttons you need, and what each operation is supposed to do in order to fulfill the purpose of your software. These are your **functional requirements**.

In addition, you probably also have some **nonfunctional requirements**: for example, the app should be fast, reliable, secure, legally compliant, and easy to maintain. These requirements might not be explicitly written down, because they may seem somewhat obvious, but they are just as important as the app's functionality: an app that is unbearably slow or unreliable might as well not exist.

Many nonfunctional requirements, such as security, fall outside the scope of this book. But there are a few nonfunctional requirements that we will consider, and this chapter will help you articulate them for your own systems:

- How to define and measure the **performance** of a system
- What it means for a service to be **reliable**—namely, continuing to work correctly, even when things go wrong
- Allowing a system to be **scalable** by having efficient ways of adding computing capacity as the load grows
- Making it easier to **maintain** a system in the long term

---

## 2. Case Study: Social Network Home Timelines

Imagine you are given the task of implementing a social network in the style of X (formerly Twitter), in which users can post messages and follow other users. This will be a huge simplification of how such a service actually works, but it will help illustrate some of the issues that arise in large-scale systems.

Let's assume that users make 500 million posts per day, or 5,700 posts per second on average. Occasionally, the rate can spike as high as 150,000 posts/second. Let's also assume that the average user follows 200 people and has 200 followers (although there is a very wide range: most people have only a handful of followers, and a few celebrities such as Barack Obama have over 100 million followers).

### 2.1. Representing Users, Posts, and Follows

Imagine we keep all of the data in a relational database. We have one table for users, one table for posts, and one table for follow relationships.

Let's say the main read operation that our social network must support is the **home timeline**, which displays recent posts by people you are following. We could write the following SQL query to get the home timeline for a particular user:

```sql
SELECT posts.*, users.* FROM posts
  JOIN follows ON posts.sender_id = follows.followee_id
  JOIN users   ON posts.sender_id = users.id
  WHERE follows.follower_id = current_user
  ORDER BY posts.timestamp DESC
  LIMIT 1000
```

To execute this query, the database will use the follows table to find everybody who current_user is following, look up recent posts by those users, and sort them by timestamp to get the most recent 1,000 posts by any of the followed users.

Posts are supposed to be timely, so let's assume that after somebody makes a post, we want their followers to be able to see it within 5 seconds. One way of doing that would be for the user's client to repeat the query above every 5 seconds while the user is online (this is known as **polling**). If we assume that 10 million users are online and logged in at the same time, that would mean running the query 2 million times per second. Even if you increase the polling interval, this is a lot.

Moreover, the query above is quite expensive: if you are following 200 people, it needs to fetch a list of recent posts by each of those 200 people, and merge those lists. 2 million timeline queries per second then means that the database needs to look up the recent posts from some sender 400 million times per second—a huge number.

### 2.2. Materializing and Updating Timelines

How can we do better? Firstly, instead of polling, it would be better if the server actively pushed new posts to any followers who are currently online. Secondly, we should precompute the results of the query above so that a user's request for their home timeline can be served from a cache.

Imagine that for each user we store a data structure containing their home timeline, i.e., the recent posts by people they are following. Every time a user makes a post, we look up all of their followers, and insert that post into the home timeline of each follower—like delivering a message to a mailbox. Now when a user logs in, we can simply give them this home timeline that we precomputed.

The downside of this approach is that we now need to do more work every time a user makes a post, because the home timelines are derived data that needs to be updated. When one initial request results in several downstream requests being carried out, we use the term **fan-out** to describe the factor by which the number of requests increases.

At a rate of 5,700 posts posted per second, if the average post reaches 200 followers (i.e., a fan-out factor of 200), we will need to do just over 1 million home timeline writes per second. This is a lot, but it's still a significant saving compared to the 400 million per-sender post lookups per second that we would otherwise have to do.

This process of precomputing and updating the results of a query is called **materialization**, and the timeline cache is an example of a **materialized view**. The materialized view speeds up reads, but in return we have to do more work on write.

> **💡 Insight**
>
> The trade-off between read-time computation and write-time precomputation is fundamental to system design. Materialized views shift work from read time to write time, which is beneficial when reads vastly outnumber writes.

---

## 3. Describing Performance

Most discussions of software performance consider two main types of metric:

| Metric | Description | Unit |
|--------|-------------|------|
| **Response time** | The elapsed time from when a user makes a request until they receive the answer | Seconds (ms, μs) |
| **Throughput** | The number of requests per second, or data volume per second | "somethings per second" |

In the social network case study, "posts per second" and "timeline writes per second" are throughput metrics, whereas the "time it takes to load the home timeline" or the "time until a post is delivered to followers" are response time metrics.

There is often a connection between throughput and response time. The service has a low response time when request throughput is low, but response time increases as load increases. This is because of **queueing**: when a request arrives on a highly loaded system, it's likely that the CPU is already in the process of handling an earlier request, and therefore the incoming request needs to wait.

### 3.1. Latency and Response Time

"Latency" and "response time" are sometimes used interchangeably, but in this book we will use the terms in a specific way:

| Term | Definition |
|------|------------|
| **Response time** | What the client sees; includes all delays incurred anywhere in the system |
| **Service time** | The duration for which the service is actively processing the user request |
| **Queueing delays** | Time spent waiting for resources (CPU, network, etc.) |
| **Latency** | Time during which a request is not being actively processed (i.e., it is latent) |

The response time can vary significantly from one request to the next, even if you keep making the same request over and over again. Many factors can add random delays: context switches, network packet loss and TCP retransmission, garbage collection pauses, page faults, and many other causes.

**Head-of-line blocking**: Queueing delays often account for a large part of the variability in response times. As a server can only process a small number of things in parallel, it only takes a small number of slow requests to hold up the processing of subsequent requests.

### 3.2. Average, Median, and Percentiles

Because the response time varies from one request to the next, we need to think of it not as a single number, but as a **distribution of values** that you can measure.

It's common to report the **average** response time of a service. However, the mean is not a very good metric if you want to know your "typical" response time, because it doesn't tell you how many users actually experienced that delay.

Usually it is better to use **percentiles**:

| Percentile | Meaning |
|------------|---------|
| **p50 (median)** | Half of requests are faster than this, half are slower |
| **p95** | 95% of requests are faster than this threshold |
| **p99** | 99% of requests are faster than this threshold |
| **p999** | 99.9% of requests are faster than this threshold |

High percentiles of response times, also known as **tail latencies**, are important because they directly affect users' experience of the service. Amazon describes response time requirements for internal services in terms of the 99.9th percentile, because the customers with the slowest requests are often those who have the most data on their accounts—the most valuable customers.

### 3.3. Use of Response Time Metrics

High percentiles are especially important in backend services that are called multiple times as part of serving a single end-user request. Even if only a small percentage of backend calls are slow, the chance of getting a slow call increases if an end-user request requires multiple backend calls—an effect known as **tail latency amplification**.

Percentiles are often used in **service level objectives (SLOs)** and **service level agreements (SLAs)** as ways of defining the expected performance and availability of a service.

---

## 4. Reliability and Fault Tolerance

Everybody has an intuitive idea of what it means for something to be reliable or unreliable. For software, typical expectations include:

- The application performs the function that the user expected
- It can tolerate the user making mistakes or using the software in unexpected ways
- Its performance is good enough for the required use case
- The system prevents any unauthorized access and abuse

If all those things together mean "working correctly," then we can understand reliability as meaning, roughly, **"continuing to work correctly, even when things go wrong."**

We distinguish between **faults** and **failures**:

| Term | Definition |
|------|------------|
| **Fault** | When a particular part of a system stops working correctly (e.g., a disk malfunctions, a machine crashes) |
| **Failure** | When the system as a whole stops providing the required service to the user |

### 4.1. Fault Tolerance

We call a system **fault-tolerant** if it continues providing the required service to the user in spite of certain faults occurring. If a system cannot tolerate a certain part becoming faulty, we call that part a **single point of failure (SPOF)**.

Fault tolerance is always limited to a certain number of certain types of faults. For example, a system might be able to tolerate a maximum of two hard drives failing at the same time. It would not make sense to tolerate any number of faults.

Counter-intuitively, in fault-tolerant systems, it can make sense to increase the rate of faults by triggering them deliberately—this is called **fault injection**. **Chaos engineering** is a discipline that aims to improve confidence in fault-tolerance mechanisms through experiments such as deliberately injecting faults.

### 4.2. Hardware and Software Faults

**Hardware faults** that can cause system failure:

- Approximately 2–5% of magnetic hard drives fail per year
- Approximately 0.5–1% of SSDs fail per year
- Approximately one in 1,000 machines has a CPU core that occasionally computes the wrong result
- Data in RAM can be corrupted by cosmic rays or physical defects
- Datacenters can become unavailable due to power outages or be destroyed by natural disasters

Our first response to unreliable hardware is usually to add **redundancy** to the individual hardware components (RAID, dual power supplies, etc.).

**Software faults** are often very highly correlated, because many nodes run the same software and thus have the same bugs:

- A software bug that causes every node to fail at the same time
- A runaway process that uses up shared resources (CPU, memory, disk)
- A service that the system depends on becomes unresponsive
- Cascading failures, where a problem in one component brings down another

There is no quick solution to software faults. Helpful measures include: careful thinking about assumptions, thorough testing, process isolation, allowing processes to crash and restart, avoiding feedback loops like retry storms, and monitoring system behavior in production.

### 4.3. Humans and Reliability

Humans design and build software systems, and the operators who keep the systems running are also human. One study found that configuration changes by operators were the leading cause of outages, whereas hardware faults played a role in only 10–25% of outages.

It is tempting to label such problems as "human error," but blaming people for mistakes is counterproductive. What we call "human error" is not really the cause of an incident, but rather a symptom of a problem with the sociotechnical system.

Various technical measures can help minimize the impact of human mistakes:

- Thorough testing
- Rollback mechanisms for quickly reverting configuration changes
- Gradual roll-outs of new code
- Detailed monitoring and observability tools
- Well-designed interfaces that encourage "the right thing"

Increasingly, organizations are adopting a culture of **blameless postmortems**: after an incident, the people involved are encouraged to share full details about what happened, without fear of punishment.

### 4.4. How Important Is Reliability?

Reliability is not just for nuclear power stations and air traffic control—more mundane applications are also expected to work reliably. Bugs in business applications cause lost productivity, and outages of e-commerce sites can have huge costs in terms of lost revenue and damage to reputation.

Consider the **Post Office Horizon scandal**: Between 1999 and 2019, hundreds of people managing Post Office branches in Britain were convicted of theft or fraud because accounting software showed a shortfall in their accounts. Eventually it became clear that many of these shortfalls were due to bugs in the software.

---

## 5. Scalability

Even if a system is working reliably today, that doesn't mean it will necessarily work reliably in the future. One common reason for degradation is **increased load**.

**Scalability** is the term we use to describe a system's ability to cope with increased load. It is meaningless to say "X is scalable" or "Y doesn't scale." Rather, discussing scalability means considering questions like:

- If the system grows in a particular way, what are our options for coping with the growth?
- How can we add computing resources to handle the additional load?
- Based on current growth projections, when will we hit the limits of our current architecture?

### 5.1. Describing Load

First, we need to succinctly describe the current load on the system. Often this will be a measure of throughput:

- Number of requests per second to a service
- How many gigabytes of new data arrive per day
- Number of shopping cart checkouts per hour
- Number of simultaneously online users

Once you have described the load, you can investigate what happens when it increases:

1. When you increase the load and keep resources unchanged, how is performance affected?
2. When you increase the load, how much do you need to increase resources to keep performance unchanged?

If you can double the resources to handle twice the load while keeping performance the same, we say you have **linear scalability**.

### 5.2. Shared-Memory, Shared-Disk, and Shared-Nothing Architecture

| Architecture | Description | Trade-offs |
|--------------|-------------|------------|
| **Shared-Memory (Vertical Scaling)** | Move to a more powerful machine with more CPUs, RAM, and disk | Cost grows faster than linearly; bottlenecks limit scalability |
| **Shared-Disk** | Multiple machines with independent CPUs/RAM but shared disk storage (NAS/SAN) | Contention and locking limit scalability |
| **Shared-Nothing (Horizontal Scaling)** | Distributed system with multiple nodes, each with own CPUs, RAM, and disks | Potential for linear scalability but requires explicit sharding and adds distributed system complexity |

The advantages of shared-nothing are that it has the potential to scale linearly, can use optimal price/performance hardware, can adjust resources dynamically, and can achieve greater fault tolerance by distributing across data centers.

### 5.3. Principles for Scalability

The architecture of systems that operate at large scale is usually highly specific to the application—there is no such thing as a generic, one-size-fits-all scalable architecture.

A good general principle for scalability is to **break a system down into smaller components that can operate largely independently from each other**. This is the underlying principle behind microservices, sharding, and stream processing.

Another good principle is **not to make things more complicated than necessary**. If a single-machine database will do the job, it's probably preferable to a complicated distributed setup.

---

## 6. Maintainability

Software does not wear out or suffer material fatigue, so it does not break in the same ways as mechanical objects do. But the requirements for an application frequently change, the environment changes, and it has bugs that need fixing.

It is widely recognized that the majority of the cost of software is not in its initial development, but in its **ongoing maintenance**—fixing bugs, keeping systems operational, investigating failures, adapting to new platforms, modifying for new use cases, repaying technical debt, and adding new features.

Every system we create today will one day become a legacy system if it is valuable enough to survive for a long time. We should design with maintenance concerns in mind:

| Principle | Description |
|-----------|-------------|
| **Operability** | Make it easy for the organization to keep the system running smoothly |
| **Simplicity** | Make it easy for new engineers to understand the system |
| **Evolvability** | Make it easy for engineers to make changes in the future |

### 6.1. Operability: Making Life Easy for Operations

"Good operations can often work around the limitations of bad software, but good software cannot run reliably with bad operations."

Good operability means making routine tasks easy, allowing the operations team to focus their efforts on high-value activities:

- Allowing monitoring tools to check key metrics
- Avoiding dependency on individual machines
- Providing good documentation and an easy-to-understand operational model
- Providing good default behavior with freedom to override
- Self-healing where appropriate, with manual control when needed
- Exhibiting predictable behavior, minimizing surprises

### 6.2. Simplicity: Managing Complexity

Small software projects can have delightfully simple and expressive code, but as projects get larger, they often become very complex and difficult to understand. A software project mired in complexity is sometimes described as a **big ball of mud**.

One of the best tools we have for managing complexity is **abstraction**. A good abstraction can hide a great deal of implementation detail behind a clean, simple-to-understand façade.

For example:
- High-level programming languages are abstractions that hide machine code
- SQL is an abstraction that hides complex on-disk data structures

### 6.3. Evolvability: Making Change Easy

It's extremely unlikely that your system's requirements will remain unchanged forever. They are much more likely to be in constant flux.

The ease with which you can modify a data system is closely linked to its simplicity and its abstractions: loosely-coupled, simple systems are usually easier to modify than tightly-coupled, complex ones.

One major factor that makes change difficult in large systems is when some action is **irreversible**. Minimizing irreversibility improves flexibility.

---

## 7. Summary

In this chapter we examined several examples of nonfunctional requirements: performance, reliability, scalability, and maintainability.

**Key takeaways:**

- **Performance** is measured through response time percentiles and throughput metrics, used in SLAs
- **Reliability** is achieved through fault tolerance techniques that allow a system to continue providing service even when components fail
- **Scalability** ensures performance stays the same when load grows, using principles like breaking tasks into independent parts
- **Maintainability** encompasses operability, simplicity, and evolvability—designing systems that are easy to operate, understand, and change

> **💡 Insight**
>
> These nonfunctional requirements are interconnected. A system that's hard to maintain will eventually become unreliable. A system that can't scale will have poor performance under load. Good architecture considers all of these dimensions together.

---

**Previous:** [Chapter 1: Trade-offs in Data Systems Architecture](/part1/chapter01-tradeoffs) | **Next:** [Chapter 3: Data Models and Query Languages](/part1/chapter03-data-models)
