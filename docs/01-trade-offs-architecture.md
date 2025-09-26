# 1. Trade-offs in Data Systems Architecture

_There are no solutions, there are only trade-offs. [...] But you try to get the best trade-off you can get, and that's all you can hope for._

— Thomas Sowell, Interview with Fred Barnes (2005)

---

**Previous:** [Table of Contents](README.md) | **Next:** [Chapter 2: Defining Nonfunctional Requirements](02-nonfunctional-requirements.md)

---

## Table of Contents

1. [Introduction to Data-Intensive Applications](#1-introduction-to-data-intensive-applications)
2. [Understanding System Building Blocks](#2-understanding-system-building-blocks)
3. [Analytical versus Operational Systems](#3-analytical-versus-operational-systems)
   - 3.1. [Transaction Processing vs Analytics](#31-transaction-processing-vs-analytics)
   - 3.2. [Data Warehousing Evolution](#32-data-warehousing-evolution)
   - 3.3. [From Data Warehouse to Data Lake](#33-from-data-warehouse-to-data-lake)
   - 3.4. [Systems of Record vs Derived Data](#34-systems-of-record-vs-derived-data)
4. [Cloud versus Self-Hosting](#4-cloud-versus-self-hosting)
   - 4.1. [The Build vs Buy Decision](#41-the-build-vs-buy-decision)
   - 4.2. [Cloud-Native Architecture](#42-cloud-native-architecture)
   - 4.3. [Operations in the Cloud Era](#43-operations-in-the-cloud-era)
5. [Distributed versus Single-Node Systems](#5-distributed-versus-single-node-systems)
   - 5.1. [When Distribution is Necessary](#51-when-distribution-is-necessary)
   - 5.2. [Problems with Distributed Systems](#52-problems-with-distributed-systems)
   - 5.3. [Microservices and Serverless](#53-microservices-and-serverless)
6. [Data Systems, Law, and Society](#6-data-systems-law-and-society)
7. [Summary](#7-summary)

---

## 1. Introduction to Data-Intensive Applications

**In plain English:** Modern applications are primarily challenged by data complexity—storing, retrieving, and processing information—rather than raw computational power.

**In technical terms:** Data-intensive applications face challenges around managing large data volumes, ensuring consistency during failures and concurrency, and maintaining high availability.

**Why it matters:** Understanding the difference between data-intensive and compute-intensive systems guides architectural decisions and technology choices.

```
Traditional Computing Challenges    →    Modern Data System Challenges
─────────────────────────────      ─────────────────────────────
Limited CPU Power                      Massive Data Volumes
Memory Constraints                      Complex Data Relationships
Single Machine Processing              Distributed Data Management
Fixed Storage Capacity                  Real-time Processing Needs
```

Data is central to much application development today. With web and mobile apps, software as a service (SaaS), and cloud services, it has become normal to store data from many different users in a shared server-based data infrastructure. Data from user activity, business transactions, devices and sensors needs to be stored and made available for analysis.

### 1.1. Data Volume Complexity

Small amounts of data, which can be stored and processed on a single machine, are often fairly easy to deal with. However, as the data volume or the rate of queries grows, it needs to be distributed across multiple machines, which introduces many challenges.

> **💡 Insight**
>
> The transition from single-machine to distributed systems isn't just about scale—it's a fundamental shift in complexity. Each additional machine multiplies the potential failure modes and coordination challenges.

We call an application **data-intensive** if data management is one of the primary challenges in developing the application. While in compute-intensive systems the challenge is parallelizing some very large computation, in data-intensive applications we usually worry more about:

- **Storing and processing large data volumes**
- **Managing changes to data**
- **Ensuring consistency in the face of failures and concurrency**
- **Making sure services are highly available**

---

## 2. Understanding System Building Blocks

**In plain English:** Most applications are built by combining standard data system components like databases, caches, and search indexes—like assembling LEGO blocks to create something more complex.

**In technical terms:** Applications typically integrate multiple specialized systems (databases, caches, search indexes, stream processors, batch processors) through application code that orchestrates their interaction.

**Why it matters:** Understanding these building blocks helps you choose the right tool for each job and architect systems that can evolve as requirements change.

Such applications are typically built from standard building blocks that provide commonly needed functionality:

```
Common Data System Building Blocks
─────────────────────────────────
📊 Databases          → Store data for later retrieval
🚀 Caches            → Speed up expensive operations
🔍 Search Indexes     → Enable keyword/filter queries
⚡ Stream Processing  → Handle real-time events
📈 Batch Processing   → Crunch large data volumes periodically
```

### 2.1. The Integration Challenge

In building an application we typically take several software systems or services, such as databases or APIs, and glue them together with some application code. If you are doing exactly what the data systems were designed for, then this process can be quite easy.

However, as your application becomes more ambitious, challenges arise:

- **How do you choose which database to use?** Different databases have different characteristics and are suitable for different purposes.
- **How do you reason about trade-offs?** Various approaches to caching, indexing, etc. each have pros and cons.
- **How do you combine tools** when no single tool can handle all requirements?

> **💡 Insight**
>
> The art of system architecture lies not in picking perfect tools (they don't exist), but in understanding trade-offs and composing imperfect tools into systems that meet your specific requirements.

This book is a guide to help you make decisions about which technologies to use and how to combine them. As you will see, there is no one approach that is fundamentally better than others; everything has pros and cons.

---

## 3. Analytical versus Operational Systems

**In plain English:** Think of the difference between a cash register (operational) and a business analyst reviewing sales reports (analytical). Same data, completely different usage patterns and requirements.

**In technical terms:** Operational systems serve real-time user requests with point queries and updates, while analytical systems perform complex aggregations over large datasets for business intelligence.

**Why it matters:** These different usage patterns require fundamentally different architectures, data layouts, and optimization strategies.

```
Data Usage Patterns in Organizations
───────────────────────────────────

Operational Systems                     Analytical Systems
      ↓                                       ↓
[User clicks buy]                      [Analyst asks: "What
[Update inventory]          →          were our top-selling
[Process payment]                      products last month?"]
[Send confirmation]                           ↓
      ↓                                [Query millions of
[Point queries]                        transaction records]
[Real-time updates]                    [Generate report]
```

If you are working on data systems in an enterprise, you will encounter several different types of people who work with data:

1. **Backend engineers** who build services handling user requests
2. **Business analysts** who generate reports for management decisions
3. **Data scientists** who look for insights and create ML-powered features

### 3.1. Transaction Processing vs Analytics

The distinction between operational and analytical systems has led to specialized terminology and architectures:

**Online Transaction Processing (OLTP)**
- Handles interactive user requests
- Point queries (lookup individual records by key)
- Create, update, delete individual records
- Fixed set of queries predefined by application
- Current state of data
- Dataset size: Gigabytes to Terabytes

**Online Analytical Processing (OLAP)**
- Handles business intelligence queries
- Aggregate over large number of records
- Bulk import (ETL) or event streams
- Analysts can make arbitrary queries
- Historical events over time
- Dataset size: Terabytes to Petabytes

| Property | Operational Systems (OLTP) | Analytical Systems (OLAP) |
|----------|---------------------------|---------------------------|
| **Main read pattern** | Point queries (fetch individual records by key) | Aggregate over large number of records |
| **Main write pattern** | Create, update, and delete individual records | Bulk import (ETL) or event stream |
| **Human user example** | End user of web/mobile application | Internal analyst, for decision support |
| **Machine use example** | Checking if an action is authorized | Detecting fraud/abuse patterns |
| **Type of queries** | Fixed set of queries, predefined by application | Analyst can make arbitrary queries |
| **Data represents** | Latest state of data (current point in time) | History of events that happened over time |
| **Dataset size** | Gigabytes to terabytes | Terabytes to petabytes |

### 3.2. Data Warehousing Evolution

**In plain English:** A data warehouse is like a specialized library for business data—it takes information from all the different operational systems and organizes it in a way that's optimized for analysis rather than day-to-day operations.

**In technical terms:** A data warehouse is a separate analytical database containing read-only copies of data from operational systems, optimized for aggregate queries rather than transactional workloads.

**Why it matters:** Separating analytical and operational workloads prevents analytics queries from impacting production performance while enabling specialized optimizations for each use case.

At first, the same databases were used for both transaction processing and analytic queries. However, in the late 1980s and early 1990s, there was a trend for companies to run analytics on a separate database system—the **data warehouse**.

#### Why Separate Analytics from Operations?

It is usually undesirable for business analysts to directly query OLTP systems for several reasons:

1. **Data silos**: Data of interest may be spread across multiple operational systems
2. **Schema mismatch**: OLTP schemas aren't optimized for analytics
3. **Performance impact**: Expensive analytic queries would slow down operational systems
4. **Security/compliance**: OLTP systems may be in separate networks

```
ETL Process Flow
──────────────────────────────────────────────

Operational Systems          Data Warehouse
      ↓                           ↓
┌─────────────┐              ┌─────────────┐
│  Web App DB │              │   Sales     │
│  POS System │    ┌───┐     │ Analytics   │
│  CRM System │───→│ETL│────→│   Schema    │
│ Supply Chain│    └───┘     │ Optimized   │
│   System    │              │ for Queries │
└─────────────┘              └─────────────┘
    ↑                             ↑
Transactional                Analytical
Processing                   Processing
```

#### Extract–Transform–Load (ETL)

The data warehouse contains a read-only copy of the data from operational systems. Data flows through an **ETL** process:

- **Extract**: Get data from OLTP databases (periodic dumps or continuous streams)
- **Transform**: Convert to analysis-friendly schema and clean up
- **Load**: Insert into the data warehouse

Sometimes the order is swapped to **ELT** (Extract–Load–Transform), where transformation happens in the warehouse after loading.

### 3.3. From Data Warehouse to Data Lake

**In plain English:** If a data warehouse is like a well-organized library with books sorted by category, a data lake is like a massive storage room where you keep everything—books, magazines, videos, audio recordings—in their original format until you need them.

**In technical terms:** A data lake is a centralized repository that stores raw data in its native format (files, images, sensor data, etc.) without requiring a predefined schema, offering more flexibility than structured data warehouses.

**Why it matters:** Data lakes enable data scientists to work with diverse data types and perform custom transformations, but require more sophisticated tooling to extract value.

A data warehouse often uses a relational data model queried through SQL, but this is less suited to data science tasks such as:

- **Feature engineering** for machine learning models
- **Natural language processing** on textual data
- **Computer vision** on images

Many data scientists prefer Python (pandas, scikit-learn), R, or distributed frameworks like Spark rather than SQL databases.

#### The Data Lake Approach

A **data lake** is a centralized repository that:
- Holds any data that might be useful for analysis
- Contains files without imposing particular formats or data models
- Can store text, images, videos, sensor readings, feature vectors, etc.
- Uses commoditized file storage (often cheaper than relational storage)

```
Data Lake Architecture
────────────────────────────────────

Raw Data Sources          Data Lake           Consumers
      ↓                      ↓                  ↓
┌─────────────┐         ┌─────────────┐   ┌─────────────┐
│ Application │         │    Files    │   │   Python    │
│    Logs     │         │   Images    │   │ Data Science│
│  Sensor     │   ───→  │   Videos    │──→│     R       │
│   Data      │         │   JSON      │   │   Spark     │
│  Database   │         │  Parquet    │   │ Notebooks   │
│  Exports    │         │    Avro     │   │  Tableau    │
└─────────────┘         └─────────────┘   └─────────────┘
```

#### The Sushi Principle

ETL processes have been generalized to **data pipelines**, and the data lake often serves as an intermediate stop containing "raw" data without transformation. This approach has been dubbed the **sushi principle**: "raw data is better" because each consumer can transform it to suit their specific needs.

### 3.4. Systems of Record vs Derived Data

**In plain English:** Think of a bank's core account balance system (system of record) versus the monthly statement you receive (derived data). If there's ever a discrepancy, the core system is always considered correct.

**In technical terms:** Systems of record hold the authoritative version of data where facts are represented exactly once, while derived data systems contain processed, cached, or transformed versions that can be recreated from the original source.

**Why it matters:** Understanding this distinction clarifies data flow and helps you design systems where it's clear which data is authoritative and which can be safely regenerated.

Related to the operational/analytical distinction, this book distinguishes between:

#### Systems of Record
- **Definition**: Source of truth holding authoritative/canonical data
- **Characteristics**: New data is written here first; each fact represented exactly once
- **Rule**: If there's discrepancy with another system, the system of record is correct

#### Derived Data Systems
- **Definition**: Result of processing data from other systems
- **Characteristics**: Can be recreated if lost; often redundant but essential for performance
- **Examples**: Caches, indexes, materialized views, ML models, transformed datasets

```
Data System Relationships
────────────────────────────────────

System of Record              Derived Data Systems
      ↓                             ↓
┌─────────────┐              ┌─────────────┐
│ User Posts  │              │   Search    │
│ Database    │     ───→     │   Index     │
│ (Original   │              │ (Derived)   │
│  Content)   │              └─────────────┘
└─────────────┘                     ↓
      ↓                      ┌─────────────┐
      └─────────────────────→│ Analytics   │
                             │ Warehouse   │
                             │ (Derived)   │
                             └─────────────┘
```

> **💡 Insight**
>
> Most databases can be either systems of record OR derived systems—it's not about the technology, it's about how you use it. A clear understanding of which data derives from which helps prevent architectural confusion.

Analytical systems are usually derived data systems because they consume data created elsewhere. Operational services may contain both systems of record (primary databases) and derived systems (indexes and caches for performance).

---

## 4. Cloud versus Self-Hosting

**In plain English:** This is like deciding whether to cook at home or eat at a restaurant. Home cooking gives you complete control but requires more effort; restaurants are convenient but you're at their mercy for menu changes and quality.

**In technical terms:** Organizations must decide whether to build and operate their own infrastructure or outsource to cloud providers, balancing control, cost, expertise requirements, and operational overhead.

**Why it matters:** This fundamental architectural decision affects everything from development speed to long-term costs to data sovereignty and system customization capabilities.

With anything an organization needs to do, one of the first questions is: **should it be done in-house, or outsourced?** Should you build or buy?

### 4.1. The Build vs Buy Decision

```
Software Deployment Spectrum
────────────────────────────────────────────────────

Bespoke           Self-hosted        Managed         SaaS
In-house          Open Source        Cloud           Products
   ↓                 ↓               Service            ↓
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│ Custom  │      │ MySQL   │      │ AWS RDS │      │ Salesforce
│ Code    │      │ on VMs  │      │ MongoDB │      │ Office 365
│ & Ops   │      │ Your    │      │ Atlas   │      │ GitHub   │
│         │      │ Hardware│      │         │      │         │
└─────────┘      └─────────┘      └─────────┘      └─────────┘
    ↑               ↑               ↑               ↑
Complete         Full Control    Managed Ops     Zero Ops
Control          Some Ops       Less Control    Vendor Lock
High Effort      Medium Effort   Lower Effort    Lowest Effort
```

The received management wisdom is that:
- **Core competencies** should be done in-house
- **Non-core, routine tasks** should be outsourced to vendors

#### Pros and Cons of Cloud Services

**Advantages:**
- **Faster time to market** if you lack operational expertise
- **Variable cost scaling** matches resource usage to demand
- **Specialized expertise** from providers focused on that service
- **Reduced operational overhead** for your team

**Disadvantages:**
- **No control over features** - can only request, not implement
- **No control over availability** - you wait when it's down
- **Limited debugging** - less visibility into performance issues
- **Vendor lock-in** risk if no compatible alternatives exist
- **Security/compliance** requires trusting the provider

> **💡 Insight**
>
> Cloud vs self-hosting isn't just a technical decision—it's a business strategy decision that affects your organization's capabilities, dependencies, and long-term flexibility.

### 4.2. Cloud-Native Architecture

**In plain English:** Instead of just moving your existing applications to run on cloud virtual machines, cloud-native means redesigning them to take advantage of cloud services as building blocks—like using cloud storage, databases, and messaging services rather than managing your own.

**In technical terms:** Cloud-native architecture leverages managed cloud services as foundational building blocks rather than just running traditional software on cloud virtual machines, enabling better scalability, reliability, and operational efficiency.

**Why it matters:** Cloud-native systems can achieve better performance, faster recovery, and easier scaling than traditional applications simply moved to the cloud, but require different architectural patterns.

The term **cloud-native** describes architecture designed from the ground up to take advantage of cloud services.

#### Layering of Cloud Services

```
Cloud Service Abstraction Layers
───────────────────────────────────

Higher Level
Services           ┌─────────────────┐
    ↑              │   Snowflake     │
    │              │   BigQuery      │
    │              │   Analytics     │
    │              └─────────────────┘
    │                      ↑
    │              ┌─────────────────┐
    │              │   S3 Storage    │
Platform           │   Managed DBs   │
Services           │   Event Streams │
    │              └─────────────────┘
    │                      ↑
    │              ┌─────────────────┐
Infrastructure     │  Virtual Machines│
Services           │  Network/Security│
    ↓              │  Block Storage   │
                   └─────────────────┘
```

**Examples by Category:**

| Category | Self-hosted Systems | Cloud-native Systems |
|----------|-------------------|-------------------|
| **Operational/OLTP** | MySQL, PostgreSQL, MongoDB | AWS Aurora, Azure SQL DB Hyperscale, Google Cloud Spanner |
| **Analytical/OLAP** | Teradata, ClickHouse, Spark | Snowflake, Google BigQuery, Azure Synapse Analytics |

#### Separation of Storage and Compute

Cloud-native systems typically separate storage and compute responsibilities:

- **Traditional**: Same computer handles both storage (disk) and computation (CPU/RAM)
- **Cloud-native**: Storage services (S3) separate from compute services
- **Implication**: Data must transfer over network for processing

```
Traditional vs Cloud-Native Architecture
──────────────────────────────────────────

Traditional Architecture    Cloud-Native Architecture
        ↓                            ↓
┌─────────────────┐              ┌─────────────┐
│     Server      │              │  Compute    │
│  ┌───────────┐  │              │  Service    │
│  │    CPU    │  │              │  (Stateless)│
│  │   Memory  │  │       ←──────│             │
│  │   Disk    │  │        Data  └─────────────┘
│  │   Data    │  │      Transfer       ↑
│  └───────────┘  │                     │
└─────────────────┘              ┌─────────────┐
       ↑                         │  Storage    │
   Fixed Coupling                │  Service    │
                                 │   (S3)      │
                                 └─────────────┘
                                       ↑
                                 Separate Services
```

### 4.3. Operations in the Cloud Era

**In plain English:** The cloud hasn't eliminated the need for operations—it's changed what operations teams focus on. Instead of managing individual servers, they now manage services, integration, costs, and application reliability.

**In technical terms:** Operations has shifted from machine-level management (disk space, patches, hardware) to service-level management (API integration, cost optimization, monitoring, automation).

**Why it matters:** Understanding this shift helps you staff and organize operations teams appropriately for cloud environments while avoiding the myth that cloud means "no ops."

Traditional operations involved:
- **Capacity planning** (monitoring disk space, adding resources)
- **Machine provisioning** and maintenance
- **Operating system** patches and updates
- **Individual server** management

#### DevOps/SRE Philosophy

Modern cloud operations emphasizes:

```
Operations Evolution
──────────────────────────────

Traditional Ops → Cloud Era Ops
      ↓                ↓
┌─────────────┐   ┌─────────────┐
│ Manual      │   │ Automated   │
│ Processes   │   │ Processes   │
│             │   │             │
│ Long-lived  │   │ Ephemeral   │
│ Servers     │   │ Resources   │
│             │   │             │
│ Infrequent  │   │ Frequent    │
│ Updates     │   │ Updates     │
│             │   │             │
│ Machine     │   │ Service     │
│ Focus       │   │ Focus       │
└─────────────┘   └─────────────┘
```

1. **Automation** over manual processes
2. **Ephemeral resources** over long-running servers
3. **Frequent updates** with reliable rollback
4. **Learning from incidents** and improving systems
5. **Knowledge preservation** as people change roles

#### New Operational Challenges

Even with cloud services, operations still requires:
- **Service selection** and integration
- **Cost optimization** (capacity planning becomes financial planning)
- **Security management** of applications and dependencies
- **Performance monitoring** and troubleshooting
- **Service orchestration** and workflow management

> **💡 Insight**
>
> Cloud computing doesn't eliminate operations—it elevates the level of abstraction. Teams shift from managing infrastructure to managing services, but the need for operational excellence remains critical.

---

## 5. Distributed versus Single-Node Systems

**In plain English:** A single-node system is like a talented individual working alone—fast, efficient, but limited by what one person can do. A distributed system is like a team—it can handle much more work, but coordination becomes a major challenge.

**In technical terms:** Distributed systems involve multiple machines communicating over a network to achieve goals that exceed single-machine capabilities, but introduce complex failure modes, consistency challenges, and performance trade-offs.

**Why it matters:** Distribution adds significant complexity, so it should be adopted only when the benefits clearly outweigh the costs—many problems can still be solved effectively on a single powerful machine.

A **distributed system** involves several machines communicating via a network. Each participating process is called a **node**.

### 5.1. When Distribution is Necessary

There are various reasons to build distributed systems:

```
Reasons for Distribution
─────────────────────────────────────────────

Inherent Distribution    Technical Requirements
        ↓                        ↓
┌─────────────────┐        ┌─────────────────┐
│ Multiple Users  │        │ Fault Tolerance │
│ Multiple Devices│        │ Scalability     │
│ Cloud Services  │        │ Low Latency     │
└─────────────────┘        │ Elasticity      │
        ↓                  │ Specialized HW  │
Business Requirements      │ Compliance      │
        ↓                  │ Sustainability  │
┌─────────────────┐        └─────────────────┘
│ Geographic      │                ↑
│ Distribution    │         Operational Benefits
│ Data Residency  │
│ Compliance      │
└─────────────────┘
```

#### Technical Reasons:
1. **Fault tolerance/high availability** - redundancy across machines
2. **Scalability** - handle load beyond single machine capacity
3. **Latency** - serve users from geographically close servers
4. **Elasticity** - scale resources up/down with demand
5. **Specialized hardware** - different workloads on optimal hardware

#### Business Reasons:
6. **Legal compliance** - data residency requirements
7. **Sustainability** - run workloads when/where renewable energy is available

#### Inherent Reasons:
8. **Multiple users/devices** - unavoidably requires network communication
9. **Cloud services** - data stored separately from processing

### 5.2. Problems with Distributed Systems

**In plain English:** Every network call can fail, timeout, or return partial results, and you often can't tell the difference between a slow response and a failed request. This uncertainty makes distributed systems fundamentally more complex than single-machine programs.

**In technical terms:** Distributed systems must handle network failures, partial failures, timing issues, and consistency challenges that don't exist in single-node systems, requiring sophisticated protocols and careful system design.

**Why it matters:** These challenges aren't edge cases—they're fundamental characteristics that must be designed around from the beginning. Ignoring them leads to data loss and system failures.

Distribution introduces several fundamental challenges:

```
Distributed System Challenges
───────────────────────────────────────────

Network Issues          Performance Issues
      ↓                        ↓
┌─────────────┐          ┌─────────────┐
│ Timeouts    │          │ Network     │
│ Failures    │          │ Latency     │
│ Retries     │          │ Bandwidth   │
│ Partitions  │          │ Limits      │
└─────────────┘          └─────────────┘
      ↓                        ↓
Reliability Issues      Consistency Issues
      ↓                        ↓
┌─────────────┐          ┌─────────────┐
│ Partial     │          │ Data Sync   │
│ Failures    │          │ Conflicts   │
│ Node Crashes│          │ Ordering    │
│ Recovery    │          │ Updates     │
└─────────────┘          └─────────────┘
```

#### Key Challenges:

1. **Network failures**: Requests can timeout without knowing if they succeeded
2. **Performance overhead**: Network calls are much slower than local function calls
3. **Debugging complexity**: Hard to identify where problems originate
4. **Data consistency**: Maintaining consistency across services becomes application's problem
5. **Observability needs**: Require sophisticated tracing and monitoring tools

> **💡 Insight**
>
> The fundamental challenge of distributed systems isn't technical—it's epistemological. You often can't know whether a remote operation succeeded, failed, or is still in progress, and you must design around this uncertainty.

#### When Single-Node is Better

```
Single-Node Advantages
────────────────────────────────

Simplicity Benefits
        ↓
┌─────────────────┐
│ No Network      │
│ Failures        │
│                 │
│ Local Function  │
│ Calls           │
│                 │
│ Easier Debug    │
│                 │
│ ACID Guarantees │
│                 │
│ Lower Cost      │
└─────────────────┘
```

**If you can do something on a single machine, it's often much simpler and cheaper** than distributed systems. Modern single-node systems are surprisingly capable:

- CPUs, memory, and disks have grown larger, faster, and more reliable
- Single-node databases like DuckDB, SQLite, and KùzuDB handle many workloads
- Sometimes a single-threaded program outperforms a 100+ CPU cluster

### 5.3. Microservices and Serverless

**In plain English:** Microservices is like organizing a company into small, independent teams where each team handles one specific business function. Each team can work at their own pace, but coordination between teams becomes a major challenge.

**In technical terms:** Microservices architecture decomposes applications into small, independently deployable services that communicate over well-defined APIs, enabling team autonomy but requiring sophisticated operational infrastructure.

**Why it matters:** Microservices solve organizational problems (team coordination) but introduce technical complexity. They're valuable for large organizations but may be unnecessary overhead for small teams.

#### Microservices Architecture

The most common distributed system pattern divides applications into **clients and servers** communicating via HTTP APIs.

```
Microservices Architecture
─────────────────────────────────────────────

Monolith → Microservices Decomposition
    ↓              ↓
┌─────────────┐   ┌─────────────┐ ┌─────────────┐
│   Single    │   │   User      │ │   Order     │
│ Application │   │  Service    │ │  Service    │
│             │──→│             │─│             │
│ - Users     │   │ - Profile   │ │ - Cart      │
│ - Orders    │   │ - Auth      │ │ - Payment   │
│ - Inventory │   │ - Sessions  │ │ - Shipping  │
│ - Payments  │   └─────────────┘ └─────────────┘
└─────────────┘          ↑              ↑
                         │              │
                   ┌─────────────┐ ┌─────────────┐
                   │ Inventory   │ │  Payment    │
                   │  Service    │ │  Service    │
                   │             │ │             │
                   │ - Stock     │ │ - Billing   │
                   │ - Supply    │ │ - Receipts  │
                   └─────────────┘ └─────────────┘
```

**Advantages:**
- **Independent deployment** reduces coordination between teams
- **Resource allocation** can be optimized per service
- **Implementation hiding** behind APIs enables internal changes
- **Database isolation** prevents cross-service performance impact

**Disadvantages:**
- **Infrastructure complexity** for each service (deployment, monitoring, logging)
- **Testing complexity** requires running dependent services
- **API evolution challenges** when clients expect certain fields
- **Network overhead** for inter-service communication

#### Serverless/Function-as-a-Service (FaaS)

```
Serverless Evolution
──────────────────────────────────────

Virtual Machines → Containers → Functions
       ↓               ↓           ↓
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Manual      │ │ Container   │ │ Auto-scaling│
│ Scaling     │ │ Orchestration│ │ Functions   │
│             │ │ (Kubernetes)│ │             │
│ Always-on   │ │ Defined     │ │ Pay-per-use │
│ Billing     │ │ Resources   │ │ Billing     │
│             │ │             │ │             │
│ Server      │ │ Less Server │ │ "Serverless"│
│ Management  │ │ Management  │ │ Management  │
└─────────────┘ └─────────────┘ └─────────────┘
```

**Serverless** brings metered billing to code execution—you only pay for actual runtime rather than provisioned resources.

**Benefits:**
- **Automatic scaling** based on demand
- **Usage-based billing** reduces idle resource costs
- **Operational simplicity** for simple functions

**Limitations:**
- **Execution time limits** for long-running processes
- **Cold start latency** when functions haven't run recently
- **Runtime environment restrictions**

> **💡 Insight**
>
> Microservices are primarily a solution to organizational challenges, not technical ones. They enable team independence but require significant operational investment. Consider your organization's size and structure when deciding.

---

## 6. Data Systems, Law, and Society

**In plain English:** Building data systems isn't just about technical requirements—you have legal and ethical responsibilities to the people whose data you're handling. Privacy laws like GDPR fundamentally change how systems must be designed.

**In technical terms:** Legal requirements like data deletion rights, residency requirements, and consent management must be considered as first-class architectural constraints, not afterthoughts, influencing fundamental design decisions.

**Why it matters:** Legal non-compliance can result in massive fines and reputational damage. More importantly, data systems affect people's lives and society, creating ethical responsibilities for engineers.

Data systems architecture is influenced not only by technical goals, but also by human needs and legal requirements.

### 6.1. Privacy Regulation Impact

Since 2018, the **General Data Protection Regulation (GDPR)** has given European residents greater control over their personal data. Similar laws exist worldwide:
- **California Consumer Privacy Act (CCPA)**
- **EU AI Act** for artificial intelligence systems
- Various national data residency requirements

```
Legal Requirements vs Technical Challenges
─────────────────────────────────────────────

Legal Right               Technical Challenge
     ↓                          ↓
┌─────────────┐           ┌─────────────────┐
│ Right to    │           │ Delete from     │
│ Erasure     │    ──→    │ Immutable Logs? │
│             │           │                 │
│ Data        │           │ Remove from ML  │
│ Portability │    ──→    │ Training Data?  │
│             │           │                 │
│ Consent     │           │ Retroactive     │
│ Withdrawal  │    ──→    │ Data Cleanup?   │
└─────────────┘           └─────────────────┘
```

#### Engineering Challenges from Legal Requirements

**Right to be Forgotten:**
- How to delete data from immutable append-only logs?
- How to remove data from derived datasets and ML models?
- How to propagate deletions through data pipelines?

**Data Minimization:**
- Collecting only data necessary for specific purposes
- Automatic expiration of data when no longer needed
- Counter to "big data" philosophy of speculative storage

### 6.2. Risk-Based Decision Making

The costs of data storage include more than infrastructure bills:

```
Total Cost of Data Storage
─────────────────────────────────────

Direct Costs          Hidden Costs
     ↓                     ↓
┌─────────────┐      ┌─────────────┐
│ S3 Bills    │      │ Legal Fines │
│ Compute     │      │ Breach Costs│
│ Personnel   │      │ Compliance  │
└─────────────┘      │ Overhead    │
                     │ Reputation  │
                     │ Risk        │
                     └─────────────┘
```

**Risk Factors:**
- **Security breaches** and data compromises
- **Legal liability** from non-compliant processing
- **Reputational damage** from privacy violations
- **User safety risks** in jurisdictions where data reveals criminalized behavior

> **💡 Insight**
>
> Sometimes the best architectural decision is not to store data at all. The principle of data minimization (Datensparsamkeit) often reduces both technical complexity and legal risk.

### 6.3. Compliance Frameworks

**Industry Standards:**
- **PCI DSS** for payment processing
- **SOC 2** for service organizations
- **HIPAA** for healthcare data
- **SOX** for financial reporting

These frameworks require:
- Regular third-party audits
- Documentation of data handling procedures
- Incident response capabilities
- Data encryption and access controls

---

## 7. Summary

This chapter introduced fundamental trade-offs in data system architecture. Key takeaways:

### 7.1. Core Distinctions

**Operational vs Analytical Systems:**
- Different access patterns require different architectures
- OLTP: Point queries, real-time updates, current state
- OLAP: Aggregations, bulk loads, historical analysis
- ETL pipelines connect operational systems to data warehouses/lakes

**Systems of Record vs Derived Data:**
- Authoritative data vs processed/cached data
- Clear data lineage prevents architectural confusion
- Derived systems can be recreated if lost

### 7.2. Deployment Decisions

**Cloud vs Self-Hosting:**
- Trade-off between control and operational overhead
- Cloud-native architectures separate storage and compute
- Operations role shifts from machines to services

**Distributed vs Single-Node:**
- Distribution adds complexity; avoid unless necessary
- Modern single-node systems are surprisingly powerful
- Microservices solve organizational problems but require operational investment

### 7.3. Legal and Ethical Considerations

**Compliance as Architecture:**
- Legal requirements must be first-class design constraints
- Privacy regulations change how systems are built
- Data minimization reduces both risk and complexity

> **💡 Insight**
>
> The recurring theme is that there are no perfect solutions, only trade-offs. Successful architecture requires understanding these trade-offs and choosing the set that best serves your specific requirements, constraints, and organizational context.

---

**Previous:** [Table of Contents](README.md) | **Next:** [Chapter 2: Defining Nonfunctional Requirements](02-nonfunctional-requirements.md)

---

_Understanding trade-offs is the foundation of good system architecture_