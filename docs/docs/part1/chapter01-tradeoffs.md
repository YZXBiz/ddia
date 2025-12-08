---
sidebar_position: 1
title: "Chapter 1: Trade-offs in Data Systems Architecture"
description: "Understanding the fundamental trade-offs in designing data systems"
---

import { Box, Arrow, Row, Column, Group, DiagramContainer, ProcessFlow, StackDiagram, CardGrid, ConnectionDiagram, ComparisonTable, colors } from '@site/src/components/diagrams';

# Trade-offs in Data Systems Architecture

_Understanding that every choice comes with consequences_

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Analytical versus Operational Systems](#2-analytical-versus-operational-systems)
   - 2.1. [OLTP vs OLAP](#21-oltp-vs-olap)
   - 2.2. [Data Warehousing](#22-data-warehousing)
   - 2.3. [Data Lakes](#23-data-lakes)
3. [Systems of Record and Derived Data](#3-systems-of-record-and-derived-data)
4. [Cloud versus Self-Hosting](#4-cloud-versus-self-hosting)
   - 4.1. [Pros and Cons of Cloud Services](#41-pros-and-cons-of-cloud-services)
   - 4.2. [Cloud-Native Architecture](#42-cloud-native-architecture)
5. [Distributed versus Single-Node Systems](#5-distributed-versus-single-node-systems)
   - 5.1. [Reasons to Distribute](#51-reasons-to-distribute)
   - 5.2. [Problems with Distributed Systems](#52-problems-with-distributed-systems)
   - 5.3. [Microservices and Serverless](#53-microservices-and-serverless)
6. [Data Systems, Law, and Society](#6-data-systems-law-and-society)
7. [Summary](#7-summary)

---

## 1. Introduction

**In plain English:** There are no perfect solutions in data systems—only trade-offs. Choosing one approach means giving up the benefits of another. This chapter helps you understand these trade-offs so you can make informed decisions.

**In technical terms:** Data-intensive applications face challenges in storing large volumes, managing data changes, ensuring consistency during failures, and maintaining high availability. The right architecture depends on understanding the trade-offs between different approaches.

**Why it matters:** Modern applications are data-intensive, not compute-intensive. Understanding trade-offs helps you choose the right tools and combine them effectively for your specific use case.

> **💡 Insight**
>
> The quote that opens this chapter—"There are no solutions, there are only trade-offs"—is the fundamental principle of system design. Every architectural decision has pros and cons. Your job is to find the best trade-off for your situation.

### 🎯 The Core Challenge

How do we build applications that need to:

<CardGrid
  cards={[
    { title: "Store Data", description: "So applications can find it again later", icon: "💾", color: colors.blue },
    { title: "Cache Results", description: "Speed up reads for expensive operations", icon: "⚡", color: colors.purple },
    { title: "Search & Filter", description: "Allow users to query by keyword", icon: "🔍", color: colors.green },
    { title: "Stream Events", description: "Handle data changes as they occur", icon: "📊", color: colors.orange }
  ]}
  columns={2}
/>

---

## 2. Analytical versus Operational Systems

**In plain English:** Think of operational systems as the cash register at a store—handling individual transactions as they happen. Analytical systems are like the accounting department—looking at all transactions together to find patterns.

**In technical terms:** Operational systems (OLTP) handle real-time transactions for external users. Analytical systems (OLAP) process large datasets to generate insights for internal decision-making.

**Why it matters:** Using the same system for both purposes often leads to poor performance. Understanding the distinction helps you design appropriate architectures.

<DiagramContainer title="Operational vs Analytical Systems">
  <Row gap="lg">
    <Group title="Operational (OLTP)" color={colors.blue}>
      <Box color={colors.blue}>Web/Mobile Apps</Box>
      <Box color={colors.blue}>Point-of-Sale</Box>
      <Box color={colors.blue}>User Transactions</Box>
    </Group>
    <Arrow direction="right" label="ETL" />
    <Group title="Analytical (OLAP)" color={colors.purple}>
      <Box color={colors.purple}>Data Warehouse</Box>
      <Box color={colors.purple}>Business Intelligence</Box>
      <Box color={colors.purple}>ML/AI Systems</Box>
    </Group>
  </Row>
</DiagramContainer>

### 2.1. OLTP vs OLAP

| Property | Operational (OLTP) | Analytical (OLAP) |
|----------|-------------------|-------------------|
| **Read Pattern** | Point queries (fetch by key) | Aggregate over many records |
| **Write Pattern** | Create/update/delete individual records | Bulk import (ETL) or event stream |
| **Users** | End users via app | Internal analysts |
| **Query Type** | Fixed, predefined by app | Ad-hoc, exploratory |
| **Data View** | Current state | Historical events over time |
| **Dataset Size** | Gigabytes to terabytes | Terabytes to petabytes |

> **💡 Insight**
>
> The separation exists for good reasons: OLTP systems prioritize **low latency** for individual operations, while OLAP systems prioritize **throughput** for scanning large datasets. Optimizing for one often hurts the other.

### 2.2. Data Warehousing

**In plain English:** A data warehouse is like a library that collects copies of all the books from every department in a company, organized in a way that makes it easy to find answers to business questions.

**In technical terms:** A data warehouse is a separate database that aggregates data from multiple operational systems via ETL (Extract-Transform-Load), optimized for analytical queries.

<DiagramContainer title="ETL Pipeline to Data Warehouse">
  <ProcessFlow
    steps={[
      { title: "Extract", description: "Pull from operational DBs", color: colors.blue },
      { title: "Transform", description: "Clean and reshape data", color: colors.purple },
      { title: "Load", description: "Write to warehouse", color: colors.green }
    ]}
  />
</DiagramContainer>

**Why separate from operational systems?**

| Problem | Solution via Warehouse |
|---------|----------------------|
| Data silos across systems | Centralized access |
| OLTP schemas not suited for analytics | Analysis-friendly schemas |
| Expensive queries impact users | No impact on production |
| Security/compliance restrictions | Controlled analyst access |

### 2.3. Data Lakes

**In plain English:** If a data warehouse is a library with organized books, a data lake is a massive storage facility where you can dump anything—books, videos, sensor data—in their original form.

**In technical terms:** A data lake stores raw data in any format (Avro, Parquet, JSON, images, etc.) without imposing a schema. It's cheaper than relational storage and more flexible for data science workloads.

<DiagramContainer title="Data Lake Architecture">
  <Column gap="md">
    <Row gap="md">
      <Box color={colors.blue}>CRM Data</Box>
      <Box color={colors.purple}>App Logs</Box>
      <Box color={colors.green}>IoT Sensors</Box>
      <Box color={colors.orange}>User Events</Box>
    </Row>
    <Arrow direction="down" />
    <Box color={colors.slate} size="lg">Data Lake (Object Storage)</Box>
    <Arrow direction="down" />
    <Row gap="md">
      <Box color={colors.cyan}>Data Warehouse</Box>
      <Box color={colors.pink}>ML Training</Box>
      <Box color={colors.green}>Analytics</Box>
    </Row>
  </Column>
</DiagramContainer>

> **💡 Insight**
>
> The "sushi principle" in data engineering: **raw data is better**. By storing data in its original form, each consumer can transform it to suit their specific needs, rather than being limited to a single transformed view.

---

## 3. Systems of Record and Derived Data

**In plain English:** A system of record is like the official birth certificate—it's the authoritative source. Derived data is like copies or summaries made from that original, which can be recreated if lost.

**In technical terms:** Systems of record hold canonical data; derived systems (caches, indexes, materialized views) are transformations that can be regenerated from the source.

<DiagramContainer title="System of Record vs Derived Data">
  <ConnectionDiagram
    nodes={[
      { id: "source", label: "System of Record", color: colors.blue, icon: "📝" },
      { id: "cache", label: "Cache", color: colors.slate },
      { id: "index", label: "Search Index", color: colors.slate },
      { id: "view", label: "Materialized View", color: colors.slate },
      { id: "model", label: "ML Model", color: colors.slate }
    ]}
    connections={[
      { from: "source", to: "cache", label: "derives" },
      { from: "source", to: "index", label: "derives" },
      { from: "source", to: "view", label: "derives" },
      { from: "source", to: "model", label: "derives" }
    ]}
    layout="hub"
  />
</DiagramContainer>

**Key Principle:** If you lose derived data, you can recreate it. If you lose the system of record, the data is gone.

---

## 4. Cloud versus Self-Hosting

**In plain English:** Should you rent infrastructure from a cloud provider, or buy and manage your own servers? It's like choosing between renting an apartment (cloud) and buying a house (self-hosting).

**In technical terms:** Cloud services outsource infrastructure operations to vendors, while self-hosting gives you full control but requires operational expertise.

<DiagramContainer title="Spectrum of Hosting Options">
  <ProcessFlow
    steps={[
      { title: "Bespoke", description: "Write & run in-house", color: colors.blue, icon: "🏠" },
      { title: "Self-Host", description: "Run open source/commercial", color: colors.purple, icon: "🖥️" },
      { title: "IaaS", description: "VMs in the cloud", color: colors.green, icon: "☁️" },
      { title: "SaaS", description: "Vendor-operated service", color: colors.orange, icon: "🌐" }
    ]}
  />
</DiagramContainer>

### 4.1. Pros and Cons of Cloud Services

<ComparisonTable
  items={[
    { label: "Operational Burden", before: "You manage everything", after: "Provider handles it" },
    { label: "Scaling", before: "Provision in advance", after: "Auto-scale on demand" },
    { label: "Cost (predictable load)", before: "Often cheaper", after: "Premium pricing" },
    { label: "Cost (variable load)", before: "Pay for peak capacity", after: "Pay for actual usage" },
    { label: "Customization", before: "Full control", after: "Limited options" },
    { label: "Debugging", before: "Full access to logs/metrics", after: "Black box" }
  ]}
  beforeTitle="Self-Hosted"
  afterTitle="Cloud Service"
  beforeColor={colors.blue}
  afterColor={colors.purple}
/>

> **💡 Insight**
>
> The biggest downside of cloud services is **loss of control**. If a feature is missing, you can only ask politely. If it goes down, you wait. If pricing changes, you pay or migrate.

### 4.2. Cloud-Native Architecture

**In plain English:** Cloud-native systems are designed from scratch to take advantage of cloud services, not just self-hosted software running on cloud VMs.

**In technical terms:** Cloud-native architectures separate storage and compute, use object stores for durability, and treat local disks as ephemeral caches.

<DiagramContainer title="Traditional vs Cloud-Native Architecture">
  <Row gap="lg">
    <Group title="Traditional" color={colors.slate}>
      <StackDiagram
        layers={[
          { label: "Application", color: colors.blue },
          { label: "Database", color: colors.purple },
          { label: "Local Disk", color: colors.slate }
        ]}
      />
    </Group>
    <Group title="Cloud-Native" color={colors.green}>
      <StackDiagram
        layers={[
          { label: "Compute (Ephemeral)", color: colors.blue },
          { label: "Database Service", color: colors.purple },
          { label: "Object Storage (S3)", color: colors.green }
        ]}
      />
    </Group>
  </Row>
</DiagramContainer>

| Category | Self-Hosted | Cloud-Native |
|----------|-------------|--------------|
| **OLTP** | MySQL, PostgreSQL, MongoDB | Aurora, Cloud Spanner |
| **OLAP** | Teradata, ClickHouse, Spark | Snowflake, BigQuery |

---

## 5. Distributed versus Single-Node Systems

**In plain English:** Should your system run on one powerful computer, or spread across many computers connected by a network? More computers isn't always better.

**In technical terms:** A distributed system involves multiple processes (nodes) communicating over a network. While necessary for some requirements, it introduces significant complexity.

### 5.1. Reasons to Distribute

<CardGrid
  cards={[
    { title: "Inherently Distributed", description: "Multi-user apps across devices", icon: "👥", color: colors.blue },
    { title: "Fault Tolerance", description: "Redundancy if machines fail", icon: "🛡️", color: colors.green },
    { title: "Scalability", description: "Data too big for one machine", icon: "📈", color: colors.purple },
    { title: "Latency", description: "Servers close to users globally", icon: "🌍", color: colors.orange },
    { title: "Elasticity", description: "Scale up/down with demand", icon: "⚡", color: colors.cyan },
    { title: "Legal Compliance", description: "Data residency requirements", icon: "⚖️", color: colors.pink }
  ]}
  columns={3}
/>

### 5.2. Problems with Distributed Systems

> **💡 Insight**
>
> "If you can do something on a single machine, this is often much simpler and cheaper compared to setting up a distributed system." Modern CPUs and disks are incredibly powerful—many workloads can run on a single node with tools like DuckDB or SQLite.

**The challenges:**

| Problem | Description |
|---------|-------------|
| **Network Failures** | Requests can timeout without knowing if they succeeded |
| **Latency** | Network calls are vastly slower than local function calls |
| **Debugging** | Where is the problem when the system is slow? |
| **Consistency** | Keeping data synchronized across services is hard |

### 5.3. Microservices and Serverless

**In plain English:** Microservices split a big application into many small services that talk to each other. Serverless goes further—you just write functions, and the cloud handles everything else.

**In technical terms:** Microservices decompose applications into independent services with their own databases. Serverless (FaaS) abstracts away server management entirely, billing by execution time.

<DiagramContainer title="Microservices Architecture">
  <Row gap="md">
    <Group title="Service A" color={colors.blue}>
      <Box color={colors.blue} size="sm">API</Box>
      <Box color={colors.blue} size="sm">DB</Box>
    </Group>
    <Arrow direction="right" />
    <Group title="Service B" color={colors.purple}>
      <Box color={colors.purple} size="sm">API</Box>
      <Box color={colors.purple} size="sm">DB</Box>
    </Group>
    <Arrow direction="right" />
    <Group title="Service C" color={colors.green}>
      <Box color={colors.green} size="sm">API</Box>
      <Box color={colors.green} size="sm">DB</Box>
    </Group>
  </Row>
</DiagramContainer>

> **💡 Insight**
>
> Microservices are **a technical solution to a people problem**: allowing teams to work independently. In small companies with few teams, microservices add unnecessary complexity—keep it simple.

---

## 6. Data Systems, Law, and Society

**In plain English:** Data systems don't exist in a vacuum. We have responsibilities to the people whose data we collect—legally (GDPR, CCPA) and ethically.

**In technical terms:** Privacy regulations (GDPR, CCPA, EU AI Act) mandate data minimization, purpose limitation, and the right to erasure. These requirements influence system architecture.

**Key principles:**

| Principle | Description |
|-----------|-------------|
| **Data Minimization** | Only collect what you need |
| **Purpose Limitation** | Use data only for stated purposes |
| **Right to Erasure** | Delete data on user request |
| **Storage Limitation** | Don't keep data longer than necessary |

> **💡 Insight**
>
> The cost of storing data isn't just the S3 bill—it includes liability risks if leaked, legal costs if non-compliant, and safety risks to users. Sometimes the best decision is to not store certain data at all.

---

## 7. Summary

### 🎯 Key Trade-offs

| Trade-off | When to Choose A | When to Choose B |
|-----------|-----------------|-----------------|
| **OLTP vs OLAP** | Serving users | Analyzing data |
| **Cloud vs Self-Host** | Variable load, fast start | Predictable load, full control |
| **Distributed vs Single** | Scale/availability needs | Simplicity matters |
| **Microservices vs Monolith** | Large teams | Small teams |

### 📋 Key Concepts

| Concept | Definition |
|---------|------------|
| **OLTP** | Online Transaction Processing—serving user requests |
| **OLAP** | Online Analytical Processing—business intelligence |
| **ETL** | Extract-Transform-Load pipeline to data warehouse |
| **Data Lake** | Raw data storage in any format |
| **System of Record** | Authoritative source of truth |
| **Derived Data** | Data that can be regenerated from source |

### 📝 Key Takeaways

- Every architectural decision is a **trade-off**—understand what you're giving up
- **Operational** and **analytical** systems have different requirements; keep them separate
- Cloud services trade **control for convenience**—evaluate based on your specific situation
- Distributed systems add complexity; **prefer single-node** when possible
- Consider **legal and ethical implications** of storing personal data

---

**Next:** [Chapter 2: Nonfunctional Requirements](./chapter02-nonfunctional-requirements.md) — Understanding reliability, scalability, and maintainability
