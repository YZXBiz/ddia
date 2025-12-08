---
sidebar_position: 1
title: "Introduction"
description: "Welcome to the DDIA Study Guide - your comprehensive resource for mastering data-intensive applications"
slug: /
---

# Designing Data-Intensive Applications

> **"There are no solutions, there are only trade-offs. But you try to get the best trade-off you can get, and that's all you can hope for."**
>
> — Thomas Sowell

Welcome to this study guide for **Designing Data-Intensive Applications** (2nd Edition) by Martin Kleppmann — your comprehensive resource for understanding how to build reliable, scalable, and maintainable data systems.

---

## Table of Contents

1. [What You'll Learn](#1-what-youll-learn)
2. [Who This Guide Is For](#2-who-this-guide-is-for)
3. [How to Use This Guide](#3-how-to-use-this-guide)
4. [Book Structure](#4-book-structure)
5. [Prerequisites](#5-prerequisites)

---

## 1. What You'll Learn

**In plain English:** How to design systems that handle large amounts of data reliably and efficiently.

**In technical terms:** You'll master the fundamental principles behind databases, distributed systems, data processing pipelines, and the trade-offs involved in building real-world applications.

**Why it matters:** Modern applications are data-intensive, not compute-intensive. Understanding these principles is essential for building systems that scale, remain reliable under failure, and evolve gracefully over time.

---

## 2. Who This Guide Is For

This guide is designed for:

| Role | What You'll Gain |
|------|-----------------|
| **Software Engineers** | Deep understanding of data systems internals and how to choose the right tools |
| **System Architects** | Framework for making informed trade-off decisions in system design |
| **Tech Leads** | Vocabulary and concepts to guide your team's technical decisions |
| **Students** | Solid foundation in distributed systems and database fundamentals |

---

## 3. How to Use This Guide

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│      Part I         │     │      Part II        │     │      Part III       │
│  ─────────────────  │ ──▶ │  ─────────────────  │ ──▶ │  ─────────────────  │
│  Foundations of     │     │  Distributed        │     │  Derived            │
│  Data Systems       │     │  Data               │     │  Data               │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

**If you're new to data systems:** Start from Part I to build a solid foundation in data models, storage engines, and encoding formats.

**If you're familiar with databases:** Jump to Part II to explore replication, partitioning, and the challenges of distributed systems.

**If you're interested in data pipelines:** Part III covers batch and stream processing, helping you understand how to derive value from data.

---

## 4. Book Structure

### Part I: Foundations of Data Systems

| Chapter | Topic | Key Concepts |
|---------|-------|--------------|
| 1 | Trade-offs in Architecture | OLTP vs OLAP, cloud vs self-hosting, distributed vs single-node |
| 2 | Nonfunctional Requirements | Performance, reliability, scalability, maintainability |
| 3 | Data Models & Query Languages | Relational, document, graph models, SQL, MapReduce |
| 4 | Storage and Retrieval | LSM-trees, B-trees, column storage, data warehouses |
| 5 | Encoding and Evolution | JSON, Protocol Buffers, Avro, schema evolution |

### Part II: Distributed Data

| Chapter | Topic | Key Concepts |
|---------|-------|--------------|
| 6 | Replication | Leader-follower, multi-leader, leaderless replication |
| 7 | Sharding | Partitioning strategies, rebalancing, request routing |
| 8 | Transactions | ACID, isolation levels, serializability, distributed transactions |
| 9 | Distributed Systems | Network issues, clocks, truth in distributed systems |
| 10 | Consistency & Consensus | Linearizability, ordering, leader election, total order broadcast |

### Part III: Derived Data

| Chapter | Topic | Key Concepts |
|---------|-------|--------------|
| 11 | Batch Processing | Unix philosophy, MapReduce, Spark, dataflow engines |
| 12 | Stream Processing | Message brokers, event sourcing, stream joins |
| 13 | Philosophy of Streaming | Unbundling databases, dataflow, end-to-end arguments |
| 14 | Ethics | Privacy, bias, accountability in data systems |

---

## 5. Prerequisites

To get the most from this guide:

- Basic programming experience (any language)
- Familiarity with SQL and relational databases
- Understanding of client-server architecture
- Curiosity about how systems work under the hood

> **💡 Insight**
>
> You don't need to be an expert—this guide explains concepts from first principles. The most important prerequisite is a genuine interest in understanding *why* systems are designed the way they are, not just *how* to use them.

---

**Ready to begin?** Start with [Chapter 1: Trade-offs in Data Systems Architecture](/part1/chapter01-tradeoffs)!
