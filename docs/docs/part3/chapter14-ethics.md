---
sidebar_position: 4
title: "Chapter 14. Doing the Right Thing"
description: "Examine the ethical implications and responsibilities when building data-intensive applications"
---

# Chapter 14. Doing the Right Thing

> Feeding AI systems on the world's beauty, ugliness, and cruelty, but expecting it to reflect only the beauty is a fantasy.
>
> _Vinay Uday Prabhu and Abeba Birhane, Large Datasets: A Pyrrhic Win for Computer Vision? (2020)_

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1. [Data is About People](#11-data-is-about-people)
   - 1.2. [Technology is Not Neutral](#12-technology-is-not-neutral)
2. [Predictive Analytics](#2-predictive-analytics)
   - 2.1. [Algorithmic Prison](#21-algorithmic-prison)
   - 2.2. [Bias and Discrimination](#22-bias-and-discrimination)
   - 2.3. [Responsibility and Accountability](#23-responsibility-and-accountability)
3. [Feedback Loops](#3-feedback-loops)
   - 3.1. [Self-Reinforcing Problems](#31-self-reinforcing-problems)
   - 3.2. [Systems Thinking](#32-systems-thinking)
4. [Privacy and Surveillance](#4-privacy-and-surveillance)
   - 4.1. [The Surveillance Thought Experiment](#41-the-surveillance-thought-experiment)
   - 4.2. [Consent and Freedom of Choice](#42-consent-and-freedom-of-choice)
   - 4.3. [What Privacy Really Means](#43-what-privacy-really-means)
5. [Data as Power](#5-data-as-power)
   - 5.1. [Data as a Toxic Asset](#51-data-as-a-toxic-asset)
   - 5.2. [Lessons from the Industrial Revolution](#52-lessons-from-the-industrial-revolution)
6. [What We Can Do](#6-what-we-can-do)
   - 6.1. [Legislation and Self-Regulation](#61-legislation-and-self-regulation)
   - 6.2. [A Culture Shift](#62-a-culture-shift)
7. [Summary: The Whole Book](#7-summary-the-whole-book)

---

## 1. Introduction

In this final chapter, we step back from the technical details to examine something fundamental: **what are we building, and what are its consequences?**

Throughout this book, we've explored architectures for reliable, scalable, and maintainable systems. But we've left out a crucial question: Is what we're building *good*?

### 1.1. Data is About People

**In plain English:** When we talk about "data," it's easy to think of it as abstract bits and bytes. But many datasets are about *people*—their behavior, interests, identities, relationships, health, and finances. Behind every row in a database is a human being.

**In technical terms:** User activity logs, purchase histories, location data, communication metadata, and behavioral profiles all represent aspects of real people's lives. We must treat such data with humanity and respect.

**Why it matters:** Software development increasingly involves ethical choices. Guidelines like the ACM Code of Ethics exist, but they're rarely discussed or enforced in practice. The result is sometimes a cavalier attitude toward privacy and potential harm.

### 1.2. Technology is Not Neutral

> **💡 Insight**
>
> A technology is not good or bad in itself—what matters is how it is used and how it affects people. A search engine and a weapon share this property: what determines their moral weight is their application and consequences. It is not sufficient for engineers to focus exclusively on technology while ignoring its effects on people.

**What makes something "good" or "bad"?**

Unlike technical concepts with precise definitions, ethics requires interpretation and judgment. Ethics is not a checklist to confirm compliance—it's a participatory, iterative process of reflection, in dialog with the people affected, with accountability for results.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    ETHICS IS NOT A CHECKLIST                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ❌ NOT ETHICS:                       ✅ ETHICS:                         │
│   ─────────────                        ────────                           │
│   □ Privacy policy exists              • Ongoing reflection              │
│   □ GDPR checkbox checked              • Dialog with affected people     │
│   □ Legal reviewed it                  • Accountability for outcomes     │
│   □ "Not my department"                • Considering unintended effects  │
│                                        • Questioning assumptions         │
│                                        • Iterating when harm is found    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Predictive Analytics

Predictive analytics is a major reason for excitement about "big data" and AI. But there's a critical difference between predicting weather and predicting whether a person is likely to reoffend, default on a loan, or make expensive insurance claims.

### 2.1. Algorithmic Prison

**In plain English:** Imagine being repeatedly rejected—for jobs, apartments, loans, insurance, air travel—without knowing why, and with no way to appeal. That's what happens when algorithms label someone as "risky."

**The problem:**

| Traditional Justice System | Algorithmic Decision-Making |
|---------------------------|----------------------------|
| Presumption of innocence | Presumption of risk |
| Proof required | Pattern matching |
| Right to appeal | Often no recourse |
| Human accountability | "The algorithm decided" |

Someone who has been (accurately or falsely) labeled as risky by algorithms may face systematic exclusion from key aspects of society. This constraint on freedom has been called **"algorithmic prison"**—sentenced without trial.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    THE ALGORITHMIC PRISON                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Person applies for:                                                     │
│                                                                           │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│   │   Job   │    │  Loan   │    │ Housing │    │Insurance│              │
│   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘              │
│        │              │              │              │                    │
│        ▼              ▼              ▼              ▼                    │
│   ┌─────────────────────────────────────────────────────────┐           │
│   │              RISK SCORING ALGORITHM                      │           │
│   │                                                          │           │
│   │  Input: Name, address, browsing history, social         │           │
│   │         graph, purchase patterns, location data...      │           │
│   │                                                          │           │
│   │  Output: "HIGH RISK" (reason: unknown/unexplainable)    │           │
│   └───────────────────────────┬─────────────────────────────┘           │
│                               │                                          │
│                               ▼                                          │
│                        ┌───────────┐                                     │
│                        │  DENIED   │  ← No explanation                   │
│                        │  DENIED   │  ← No appeal process                │
│                        │  DENIED   │  ← No proof of guilt                │
│                        │  DENIED   │  ← Sentence: indefinite             │
│                        └───────────┘                                     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Bias and Discrimination

**In plain English:** If you train an AI on biased historical data, it will learn and amplify that bias. It's like asking someone who grew up in a racist household to be an impartial judge—their prejudices are baked in.

**The laundering problem:**

There's hope that data-driven decisions might be more fair than subjective human judgments. But algorithms learn patterns from historical data—and if that data contains bias, the algorithm will amplify it.

> **💡 Insight**
>
> "Machine learning is like money laundering for bias." — Maciej Cegłowski
>
> This satirizes the belief that an algorithm could somehow take biased data as input and produce fair output. If the past is discriminatory, predictive analytics codify and amplify that discrimination.

**Proxy discrimination:**

Anti-discrimination laws prohibit treating people differently based on protected traits (race, gender, age, disability). But what if other features correlate with protected traits?

| Seemingly Neutral Data | What It Can Reveal |
|-----------------------|-------------------|
| Postal/ZIP code | Race (in segregated neighborhoods) |
| First name | Gender, ethnicity |
| IP address | Location → race, income |
| Purchasing patterns | Religion, health conditions |
| Browser history | Sexual orientation, beliefs |

### 2.3. Responsibility and Accountability

**Who is responsible when algorithms fail?**

- If a human makes a mistake, they can be held accountable
- If a self-driving car causes an accident, who is responsible?
- If a credit algorithm discriminates, is there recourse?
- If your ML system faces judicial review, can you explain how it decided?

**Credit scores vs. predictive analytics:**

| Traditional Credit Score | ML-Based Scoring |
|-------------------------|------------------|
| Based on *your* borrowing history | Based on *people like you* |
| Errors can be corrected | Errors nearly impossible to identify |
| "How did you behave?" | "Who is similar to you?" |
| Specific, auditable factors | Opaque, unexplainable patterns |

> **💡 Insight**
>
> Much data is statistical—even if the probability distribution is correct overall, individual cases may be wrong. If average life expectancy is 80 years, that doesn't mean you'll die on your 80th birthday. Similarly, a prediction system's output may be correct on average but wrong for *you* specifically.

---

## 3. Feedback Loops

### 3.1. Self-Reinforcing Problems

Predictive analytics create **feedback loops** where predictions influence outcomes, which then reinforce the predictions.

**Example: The credit score trap**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SELF-REINFORCING FEEDBACK LOOP                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────────────┐                                                    │
│   │ Good worker,    │                                                    │
│   │ good credit     │                                                    │
│   └────────┬────────┘                                                    │
│            │                                                              │
│            ▼  Unexpected misfortune (medical emergency, job loss)        │
│   ┌─────────────────┐                                                    │
│   │ Missed payments │                                                    │
│   └────────┬────────┘                                                    │
│            │                                                              │
│            ▼                                                              │
│   ┌─────────────────┐                                                    │
│   │ Credit score    │                                                    │
│   │ drops           │◀──────────────────────────────┐                    │
│   └────────┬────────┘                               │                    │
│            │                                         │                    │
│            ▼                                         │                    │
│   ┌─────────────────┐                               │                    │
│   │ Harder to find  │                               │ Reinforces         │
│   │ employment      │                               │                    │
│   └────────┬────────┘                               │                    │
│            │                                         │                    │
│            ▼                                         │                    │
│   ┌─────────────────┐                               │                    │
│   │ Prolonged       │                               │                    │
│   │ joblessness     │───────────────────────────────┘                    │
│   └────────┬────────┘                                                    │
│            │                                                              │
│            ▼                                                              │
│   ┌─────────────────┐                                                    │
│   │ Deeper poverty  │  ← Downward spiral due to poisonous                │
│   │ & worse scores  │    assumptions, hidden behind                      │
│   └─────────────────┘    mathematical rigor                              │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Example: Algorithmic price collusion**

When gas stations in Germany introduced algorithmic pricing, economists found that competition *decreased* and consumer prices *increased*—because the algorithms learned to collude without any explicit agreement.

### 3.2. Systems Thinking

We can't always predict feedback loops. But we can try by using **systems thinking**—analyzing not just the computerized parts, but the entire system including people interacting with it.

**Key questions:**
- Does the system reinforce existing differences (making the rich richer, poor poorer)?
- Or does it combat injustice?
- What are the unintended consequences?

---

## 4. Privacy and Surveillance

### 4.1. The Surveillance Thought Experiment

**Try replacing "data" with "surveillance":**

> "In our **surveillance**-driven organization, we collect real-time **surveillance** streams and store them in our **surveillance** warehouse. Our **surveillance** scientists use advanced analytics and **surveillance** processing to derive new insights."

Does that still sound good? The point is stark but necessary for this book: *Designing Surveillance-Intensive Applications*.

> **💡 Insight**
>
> In our attempt to make software "eat the world," we have built the greatest mass surveillance infrastructure the world has ever seen. We are rapidly approaching a world where every inhabited space contains at least one internet-connected microphone—smartphones, smart TVs, voice assistants, baby monitors, even children's toys with cloud-based speech recognition.

**Historical perspective:**

Even the most totalitarian regimes could only *dream* of:
- Putting a microphone in every room
- Forcing everyone to carry a device tracking their location
- Recording all communications and purchases

Yet we now *voluntarily* accept this. The difference? The data is collected by corporations for services, not governments for control. But the capability is the same.

### 4.2. Consent and Freedom of Choice

**"Users agreed to the privacy policy"**

This argument has several problems:

| Claim | Reality |
|-------|---------|
| "Users consented" | Privacy policies obscure rather than illuminate |
| "It's a fair exchange" | No negotiation; terms are take-it-or-leave-it |
| "They can opt out" | Opting out of essential services isn't realistic |
| "Data is only about them" | Your data reveals things about others too |

**The GDPR standard for consent:**

The EU's General Data Protection Regulation requires that consent be:
- **Freely given** — not coerced
- **Specific** — for defined purposes
- **Informed** — clearly explained
- **Unambiguous** — no pre-ticked boxes or silence

If withdrawing consent causes detriment, it wasn't "freely given."

**Network effects trap:**

For services that are "regarded by most people as essential for basic social participation," opting out has real social costs. Choosing not to use a dominant social network means missing opportunities—professional, social, informational.

### 4.3. What Privacy Really Means

**Privacy is NOT about keeping secrets.** It's about having the **freedom to choose** what to reveal, to whom, for what purpose.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    WHAT PRIVACY ACTUALLY MEANS                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ❌ MISCONCEPTION:           ✅ REALITY:                                 │
│   ────────────────            ───────────                                 │
│   "Privacy means              "Privacy means having the                   │
│    keeping everything          CHOICE about what to reveal,               │
│    secret"                     to whom, and for what purpose"             │
│                                                                           │
│   EXAMPLE:                                                                │
│   ────────                                                                │
│   Someone with a rare disease might WANT to share their                  │
│   medical data with researchers who could develop treatments.            │
│                                                                           │
│   But they would NOT want that data to affect their:                     │
│   • Insurance coverage                                                    │
│   • Employment opportunities                                              │
│   • Social relationships                                                  │
│                                                                           │
│   Privacy = THEY decide, not a corporation's profit model                │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**When surveillance collects data, privacy rights are transferred:**

Companies say "trust us to do the right thing"—meaning the right to decide what to reveal and what to keep secret shifts from the individual to the company. The company then exercises that privacy right to maximize profit, not to serve the individual.

---

## 5. Data as Power

### 5.1. Data as a Toxic Asset

Data is sometimes called "exhaust"—worthless waste to be recycled. But this view is backwards. From an economic perspective, if targeted advertising pays for a service, then user activity that generates behavioral data is a form of **labor**.

**Data is valuable:**
- Data brokers buy, aggregate, analyze, and resell personal information
- Startups are valued by "eyeballs"—i.e., surveillance capabilities
- When companies go bankrupt, user data is sold as an asset

**Data is dangerous:**

| Risk | Consequence |
|------|-------------|
| Data breaches | Intimate details exposed to criminals |
| Government access | Secret deals, legal compulsion, or theft |
| Company acquisition | New owners may not share your values |
| Regime change | Data collected today may be used by future authoritarian governments |

> **💡 Insight**
>
> Data has been called a "toxic asset" or "hazardous material." Maybe data is not the new gold, nor the new oil, but rather **the new uranium**—incredibly powerful and amazingly dangerous. "It is poor civic hygiene to install technologies that could someday facilitate a police state."

**"Knowledge is power":**

To scrutinize others while avoiding scrutiny oneself is one of the most important forms of power. This is why totalitarian governments want surveillance. Although tech companies don't overtly seek political power, the data they've accumulated gives them immense power over our lives—largely surreptitious, outside public oversight.

### 5.2. Lessons from the Industrial Revolution

**In plain English:** The Industrial Revolution brought economic growth and improved living standards—but also child labor, dangerous working conditions, and terrible pollution. It took decades to establish safeguards. We're in a similar transition with data.

```
┌──────────────────────────────────────────────────────────────────────────┐
│              INDUSTRIAL REVOLUTION vs. INFORMATION AGE                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   INDUSTRIAL REVOLUTION               INFORMATION AGE                     │
│   ──────────────────────              ───────────────                     │
│                                                                           │
│   Problem: Pollution                  Problem: Data collection            │
│   • Air (smoke, chemicals)            • Behavioral surveillance           │
│   • Water (industrial waste)          • Location tracking                 │
│   • Child labor                       • Predictive profiling              │
│   • Dangerous workplaces              • Algorithmic discrimination        │
│                                                                           │
│   Solution: Regulation                Solution: ???                        │
│   • Environmental protection          • GDPR (partial)                    │
│   • Safety protocols                  • Industry self-regulation          │
│   • Child labor laws                  • Engineering ethics                │
│   • Health inspections                • Culture shift needed              │
│                                                                           │
│   "Data is the pollution problem of the information age,                 │
│    and protecting privacy is the environmental challenge."               │
│                                       — Bruce Schneier                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

> **💡 Insight**
>
> Just as we look back at the early Industrial Revolution and wonder how our ancestors could have ignored pollution in their rush to build an industrial world, our grandchildren will look back at us during these early decades of the information age and judge us on how we addressed the challenge of data collection and misuse. We should try to make them proud.

---

## 6. What We Can Do

### 6.1. Legislation and Self-Regulation

**GDPR principles:**

The European GDPR states that personal data must be:
- Collected for **specified, explicit, and legitimate purposes**
- **Not processed** in ways incompatible with those purposes
- **Adequate, relevant, and limited** to what is necessary

**The tension:**

This principle of **data minimization** directly conflicts with the philosophy of Big Data, which maximizes data collection, combines datasets, and explores for unexpected insights. "Exploration" means using data for *unforeseen* purposes—the opposite of "specified and explicit."

**Reality check:**
- GDPR has had some effect on online advertising
- But enforcement has been weak
- Little cultural change in the broader tech industry

### 6.2. A Culture Shift

Fundamentally, we need a **culture shift** in tech:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    THE CULTURE SHIFT WE NEED                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   STOP:                                START:                             │
│   ─────                                ──────                             │
│   • Viewing users as metrics           • Remembering users are humans     │
│   • Maximizing data collection         • Minimizing what we collect       │
│   • Keeping users in the dark          • Educating users about data use   │
│   • Retaining data forever             • Purging when no longer needed    │
│   • Treating privacy as obstacle       • Treating privacy as fundamental  │
│   • "Not my department"                • Taking responsibility            │
│                                                                           │
│   PRINCIPLE: Data you don't have is data that can't be:                  │
│   • Leaked                                                                │
│   • Stolen                                                                │
│   • Compelled by governments to be handed over                           │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**As engineers, if we don't consider the societal impact of our work, we're not doing our job.**

Individual rights over personal data are like a national park—if we don't explicitly protect and care for them, they will be destroyed. It will be the tragedy of the commons, and we will all be worse off.

Ubiquitous surveillance is not inevitable. We are still able to stop it.

---

## 7. Summary: The Whole Book

This brings us to the end of the book. Let's recap the journey:

### Part I: Foundations of Data Systems

**Chapter 1 — Trade-offs:** Analytical vs. operational systems, cloud vs. self-hosting, distributed vs. single-node, balancing business and user needs.

**Chapter 2 — Nonfunctional Requirements:** Performance, reliability, scalability, and maintainability.

**Chapter 3 — Data Models:** Relational, document, and graph models; event sourcing; DataFrames. Query languages: SQL, Cypher, SPARQL, Datalog, GraphQL.

**Chapter 4 — Storage and Retrieval:** LSM-trees and B-trees for OLTP, column-oriented storage for analytics, full-text and vector search for information retrieval.

**Chapter 5 — Encoding and Evolution:** Data serialization formats, schema evolution, and data flow via databases, services, workflows, and events.

### Part II: Distributed Data

**Chapter 6 — Replication:** Single-leader, multi-leader, and leaderless replication; consistency models; sync engines for offline operation.

**Chapter 7 — Sharding:** Partitioning strategies, rebalancing, request routing, secondary indexes.

**Chapter 8 — Transactions:** Durability, isolation levels (read committed, snapshot, serializable), distributed transactions.

**Chapter 9 — Distributed Systems Fundamentals:** Network faults, clock errors, process pauses, and why even simple things like locks are hard.

**Chapter 10 — Consistency and Consensus:** Consensus algorithms and linearizability.

### Part III: Derived Data

**Chapter 11 — Batch Processing:** Unix tools to MapReduce to modern dataflow engines; distributed filesystems and object stores.

**Chapter 12 — Stream Processing:** Message brokers, change data capture, fault tolerance, streaming joins.

**Chapter 13 — Streaming Philosophy:** Integrating disparate systems, evolving systems, scaling applications.

**Chapter 14 — Doing the Right Thing:** Data can do good, but also harm—discrimination, surveillance, exploitation. We carry responsibility.

---

### Final Thoughts

> **💡 Insight**
>
> Data can be used to do good, but it can also do significant harm: making decisions that seriously affect people's lives and are difficult to appeal; leading to discrimination and exploitation; normalizing surveillance; exposing intimate information. We run the risk of data breaches, and well-intentioned uses may have unintended consequences.

As software and data have such a large impact on the world, we as engineers must remember that we carry a responsibility to work toward the kind of world we want to live in: **a world that treats people with humanity and respect.**

Let's work together toward that goal.

---

**Previous:** [Chapter 13](chapter13-streaming-philosophy.md) | **Next:** [Glossary](#)
