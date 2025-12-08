---
sidebar_position: 1
title: "Chapter 11. Batch Processing"
description: "Learn about batch processing systems, MapReduce, and distributed data processing"
---

Chapter 11. Batch Processing
A system cannot be successful if it is too strongly influenced by a single person. Once the initial design is complete and fairly robust, the real test begins as people with many different viewpoints undertake their own experiments.

Donald Knuth

In this chapter, we explored the design and implementation of batch processing systems. We began with the classic Unix toolchain (awk, sort, uniq, etc.), to illustrate fundamental batch processing primitives such as sorting and counting.

We then scaled up to distributed batch processing systems. We saw that batch-style I/O processes immutable, bounded input datasets to produce output data, allowing reruns and debugging without side effects. To process files, we saw that batch frameworks have three main components: an orchestration layer that determines where and when jobs run, a storage layer to persist data, and a computation layer that processes the actual data.

We looked at how distributed filesystems and object stores manage large files through block-based replication, caching, and metadata services, and how modern batch frameworks interact with these systems using pluggable APIs. We also discussed how orchestrators schedule tasks, allocate resources, and handle faults in large clusters. We also compared job orchestrators that schedule jobs with workflow orchestrators that manage the lifecycle of a collection of jobs that run in a dependency graph.

We surveyed batch processing models, starting with MapReduce and its canonical map and reduce functions. Next, we turned to dataflow engines like Spark and Flink, which offer simpler-to-use dataflow APIs and better performance. To understand how batch jobs scale, we covered the shuffle algorithm, a foundational operation that enables grouping, joining, and aggregation.

As batch systems matured, focus shifted to usability. You learned about high-level query languages like SQL and DataFrame APIs, which make batch jobs more accessible and easier to optimize. Query optimizers translate declarative queries into efficient execution plans.

We finished the chapter with common batch processing use cases:

ETL pipelines, which extract, transform, and load data between different systems using scheduled workflows;

Analytics, where batch jobs support both pre-aggregated dashboards and ad hoc queries;

Machine learning, where batch jobs prepare and process large training datasets;

Bulk imports, which populate production-facing systems from batch outputs, often via streams or bulk loading tools.

In the next chapter, we will turn to stream processing, in which the input is unbounded—that is, you still have a job, but its inputs are never-ending streams of data. In this case, a job is never complete, because at any time there may still be more work coming in. We shall see that stream and batch processing are similar in some respects, but the assumption of unbounded streams also changes a lot about how we build systems.

Footnotes
References
 Nathan Marz. How to Beat the CAP Theorem. nathanmarz.com, October 2011. Archived at perma.cc/4BS9-R9A4

 Molly Bartlett Dishman and Martin Fowler. Agile Architecture. At O’Reilly Software Architecture Conference, March 2015.

 Jeffrey Dean and Sanjay Ghemawat. MapReduce: Simplified Data Processing on Large Clusters. At 6th USENIX Symposium on Operating System Design and Implementation (OSDI), December 2004.

 Shivnath Babu and Herodotos Herodotou. Massively Parallel Databases and MapReduce Systems. Foundations and Trends in Databases, volume 5, issue 1, pages 1–104, November 2013. doi:10.1561/1900000036

 David J. DeWitt and Michael Stonebraker. MapReduce: A Major Step Backwards. Originally published at databasecolumn.vertica.com, January 2008. Archived at perma.cc/U8PA-K48V

 Henry Robinson. The Elephant Was a Trojan Horse: On the Death of Map-Reduce at Google. the-paper-trail.org, June 2014. Archived at perma.cc/9FEM-X787

 Urs Hölzle. R.I.P. MapReduce. After having served us well since 2003, today we removed the remaining internal codebase for good. twitter.com, September 2019. Archived at perma.cc/B34T-LLY7

 Adam Drake. Command-Line Tools Can Be 235x Faster than Your Hadoop Cluster. aadrake.com, January 2014. Archived at perma.cc/87SP-ZMCY

 sort: Sort text files. GNU Coreutils 9.7 Documentation, Free Software Foundation, Inc., 2025.

 Michael Ovsiannikov, Silvius Rus, Damian Reeves, Paul Sutter, Sriram Rao, and Jim Kelly. The Quantcast File System. Proceedings of the VLDB Endowment, volume 6, issue 11, pages 1092–1101, August 2013. doi:10.14778/2536222.2536234

 Andrew Wang, Zhe Zhang, Kai Zheng, Uma Maheswara G., and Vinayakumar B. Introduction to HDFS Erasure Coding in Apache Hadoop. blog.cloudera.com, September 2015. Archived at archive.org

 Andy Warfield. Building and operating a pretty big storage system called S3. allthingsdistributed.com, July 2023. Archived at perma.cc/7LPK-TP7V

 Vinod Kumar Vavilapalli, Arun C. Murthy, Chris Douglas, Sharad Agarwal, Mahadev Konar, Robert Evans, Thomas Graves, Jason Lowe, Hitesh Shah, Siddharth Seth, Bikas Saha, Carlo Curino, Owen O’Malley, Sanjay Radia, Benjamin Reed, and Eric Baldeschwieler. Apache Hadoop YARN: Yet Another Resource Negotiator. At 4th Annual Symposium on Cloud Computing (SoCC), October 2013. doi:10.1145/2523616.2523633

 Richard M. Karp. Reducibility Among Combinatorial Problems. Complexity of Computer Computations. The IBM Research Symposia Series. Springer, 1972. doi:10.1007/978-1-4684-2001-2_9

 J. D. Ullman. NP-Complete Scheduling Problems. Journal of Computer and System Sciences, volume 10, issue 3, June 1975. doi:10.1016/S0022-0000(75)80008-0

 Gilad David Maayan. The complete guide to spot instances on AWS, Azure and GCP. datacenterdynamics.com, March 2021. Archived at archive.org

 Abhishek Verma, Luis Pedrosa, Madhukar Korupolu, David Oppenheimer, Eric Tune, and John Wilkes. Large-Scale Cluster Management at Google with Borg. At 10th European Conference on Computer Systems (EuroSys), April 2015. doi:10.1145/2741948.2741964

 Matei Zaharia, Mosharaf Chowdhury, Tathagata Das, Ankur Dave, Justin Ma, Murphy McCauley, Michael J. Franklin, Scott Shenker, and Ion Stoica. Resilient Distributed Datasets: A Fault-Tolerant Abstraction for In-Memory Cluster Computing. At 9th USENIX Symposium on Networked Systems Design and Implementation (NSDI), April 2012.

 Paris Carbone, Stephan Ewen, Seif Haridi, Asterios Katsifodimos, Volker Markl, and Kostas Tzoumas. Apache Flink™: Stream and Batch Processing in a Single Engine. Bulletin of the IEEE Computer Society Technical Committee on Data Engineering, volume 38, issue 4, December 2015. Archived at perma.cc/G3N3-BKX5

 Mark Grover, Ted Malaska, Jonathan Seidman, and Gwen Shapira. Hadoop Application Architectures. O’Reilly Media, 2015. ISBN: 978-1-491-90004-8

 Jules S. Damji, Brooke Wenig, Tathagata Das, and Denny Lee. Learning Spark, 2nd Edition. O’Reilly Media, 2020. ISBN: 978-1492050049

 Michael Isard, Mihai Budiu, Yuan Yu, Andrew Birrell, and Dennis Fetterly. Dryad: Distributed Data-Parallel Programs from Sequential Building Blocks. At 2nd European Conference on Computer Systems (EuroSys), March 2007. doi:10.1145/1272996.1273005

 Daniel Warneke and Odej Kao. Nephele: Efficient Parallel Data Processing in the Cloud. At 2nd Workshop on Many-Task Computing on Grids and Supercomputers (MTAGS), November 2009. doi:10.1145/1646468.1646476

 Hossein Ahmadi. In-memory query execution in Google BigQuery. cloud.google.com, August 2016. Archived at perma.cc/DGG2-FL9W

 Tom White. Hadoop: The Definitive Guide, 4th edition. O’Reilly Media, 2015. ISBN: 978-1-491-90163-2

 Fabian Hüske. Peeking into Apache Flink’s Engine Room. flink.apache.org, March 2015. Archived at perma.cc/44BW-ALJX

 Mostafa Mokhtar. Hive 0.14 Cost Based Optimizer (CBO) Technical Overview. hortonworks.com, March 2015. Archived on archive.org

 Michael Armbrust, Reynold S. Xin, Cheng Lian, Yin Huai, Davies Liu, Joseph K. Bradley, Xiangrui Meng, Tomer Kaftan, Michael J. Franklin, Ali Ghodsi, and Matei Zaharia. Spark SQL: Relational Data Processing in Spark. At ACM International Conference on Management of Data (SIGMOD), June 2015. doi:10.1145/2723372.2742797

 Ammar Chalifah. Tracking payments at scale. bolt.eu.com, June 2025. Archived at perma.cc/Q4KX-8K3J

 Nafi Ahmet Turgut, Hamza Akyıldız, Hasan Burak Yel, Mehmet İkbal Özmen, Mutlu Polatcan, Pinar Baki, and Esra Kayabali. Demand forecasting at Getir built with Amazon Forecast. aws.amazon.com.com, May 2023. Archived at perma.cc/H3H6-GNL7

 Jason (Siyu) Zhu. Enhancing homepage feed relevance by harnessing the power of large corpus sparse ID embeddings. linkedin.com, August 2023. Archived at archive.org

 Avery Ching, Sital Kedia, and Shuojie Wang. Apache Spark @Scale: A 60 TB+ production use case. engineering.fb.com, August 2016. Archived at perma.cc/F7R5-YFAV

 Edward Kim. How ACH works: A developer perspective — Part 1. engineering.gusto.com, April 2014. Archived at perma.cc/F67P-VBLK

 Zhamak Dehghani. How to Move Beyond a Monolithic Data Lake to a Distributed Data Mesh. martinfowler.com, May 2019. Archived at perma.cc/LN2L-L4VC

 Chris Riccomini. What the Heck is a Data Mesh?! cnr.sh, June 2021. Archived at perma.cc/NEJ2-BAX3

 Chad Sanderson. What Are Data Contracts? What Leaders Need to Know. gable.ai, January 2024. Archived at perma.cc/C6CJ-YC8B

 Daniel Abadi. Data Fabric vs. Data Mesh: What’s the Difference? starburst.io, November 2021. Archived at perma.cc/RSK3-HXDK

 Michael Armbrust, Ali Ghodsi, Reynold Xin, and Matei Zaharia. Lakehouse: A New Generation of Open Platforms that Unify Data Warehousing and Advanced Analytics. At 11th Annual Conference on Innovative Data Systems Research (CIDR), January 2021.

 Leslie G. Valiant. A Bridging Model for Parallel Computation. Communications of the ACM, volume 33, issue 8, pages 103–111, August 1990. doi:10.1145/79173.79181

 Stephan Ewen, Kostas Tzoumas, Moritz Kaufmann, and Volker Markl. Spinning Fast Iterative Data Flows. Proceedings of the VLDB Endowment, volume 5, issue 11, pages 1268-1279, July 2012. doi:10.14778/2350229.2350245

 Grzegorz Malewicz, Matthew H. Austern, Aart J. C. Bik, James C. Dehnert, Ilan Horn, Naty Leiser, and Grzegorz Czajkowski. Pregel: A System for Large-Scale Graph Processing. At ACM International Conference on Management of Data (SIGMOD), June 2010. doi:10.1145/1807167.1807184

 Richard MacManus. OpenAI Chats about Scaling LLMs at Anyscale’s Ray Summit. thenewstack.io, September 2023. Archived at perma.cc/YJD6-KUXU

 Jay Kreps. Why Local State is a Fundamental Primitive in Stream Processing. oreilly.com, July 2014. Archived at perma.cc/P8HU-R5LA

 Félix GV. Open Sourcing Venice – LinkedIn’s Derived Data Platform. linkedin.com, September 2022. Archived at archive.org


search
Previous chapter
10. Consistency and Consensus
Next chapter
12. Stream Processing

---

**Previous:** [Chapter 10](../part2/chapter10-consistency-consensus.md) | **Next:** [Chapter 12](chapter12-stream-processing.md)
