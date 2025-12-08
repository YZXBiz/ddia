---
sidebar_position: 4
title: "Chapter 14. Doing the Right Thing"
description: "Examine the ethical implications and responsibilities in data systems"
---

Chapter 14. Doing the Right Thing
Feeding AI systems on the world’s beauty, ugliness, and cruelty, but expecting it to reflect only the beauty is a fantasy.

Vinay Uday Prabhu and Abeba Birhane, Large Datasets: A Pyrrhic Win for Computer Vision? (2020)

In Chapter 1 we contrasted analytical and operational systems, compared the cloud to self-hosting, weighed up distributed and single-node systems, and discussed balancing the needs of your business with the needs of your users.

In Chapter 2 we saw how to define several nonfunctional requirements such as performance, reliability, scalability, and maintainability.

In Chapter 3 we explored a spectrum of data models, including the relational, document, and graph models, event sourcing, and DataFrames. We also looked at examples of various query languages, including SQL, Cypher, SPARQL, Datalog, and GraphQL.

In Chapter 4 we discussed storage engines for OLTP (LSM-trees and B-trees), for analytics (column-oriented storage), and indexes for information retrieval (full-text and vector search).

In Chapter 5 we examined different ways of encoding data objects as bytes, and how to support evolution as requirements change. We also compared several ways how data flows between processes: via databases, service calls, workflow engines, or event-driven architectures.

In Chapter 6 we studied the trade-offs between single-leader, multi-leader, and leaderless replication. We also looked at consistency models such as read-after-write consistency, and sync engines that allow clients to work offline.

In Chapter 7 we went into sharding, including strategies for rebalancing, request routing, and secondary indexing.

In Chapter 8 we covered transactions: durability, how various isolation levels (read committed, snapshot isolation, and serializable) can be achieved, and how atomicity can be ensured in distributed transactions.

In Chapter 9 we surveyed fundamental problems that occur in distributed systems (network faults and delays, clock errors, process pauses, crashes), and saw how they make it difficult to correctly implement even something seemingly simple like a lock.

In Chapter 10 we went on a deep-dive into various forms of consensus and the consistency model (linearizability) it enables.

In Chapter 11 we dug into batch processing, building up from simple chains of Unix tools to large-scale distributed batch processors using distributed filesystems or object stores.

In Chapter 12 we generalized batch processing to stream processing, discussed the underlying message brokers, change data capture, fault tolerance, and processing patterns such as streaming joins.

In Chapter 13 we explored a philosophy of streaming systems that allows disparate data systems to be integrated, systems to be evolved, and applications to be scaled more easily.

Finally, in this last chapter, we took a step back and examined some ethical aspects of building data-intensive applications. We saw that although data can be used to do good, it can also do significant harm: making decisions that seriously affect people’s lives and are difficult to appeal against, leading to discrimination and exploitation, normalizing surveillance, and exposing intimate information. We also run the risk of data breaches, and we may find that a well-intentioned use of data has unintended consequences.

As software and data are having such a large impact on the world, we as engineers must remember that we carry a responsibility to work toward the kind of world that we want to live in: a world that treats people with humanity and respect. Let’s work together towards that goal.

Footnotes
References
 David Schmudde. What If Data Is a Bad Idea?. schmud.de, August 2024. Archived at perma.cc/ZXU5-XMCT

 ACM Code of Ethics and Professional Conduct. Association for Computing Machinery, acm.org, 2018. Archived at perma.cc/SEA8-CMB8

 Igor Perisic. Making Hard Choices: The Quest for Ethics in Machine Learning. linkedin.com, November 2016. Archived at perma.cc/DGF8-KNT7

 John Naughton. Algorithm Writers Need a Code of Conduct. theguardian.com, December 2015. Archived at perma.cc/TBG2-3NG6

 Ben Green. “Good” isn’t good enough. At NeurIPS Joint Workshop on AI for Social Good, December 2019. Archived at perma.cc/H4LN-7VY3

 Deborah G. Johnson and Mario Verdicchio. Ethical AI is Not about AI. Communications of the ACM, volume 66, issue 2, pages 32–34, January 2023. doi:10.1145/3576932

 Marc Steen. Ethics as a Participatory and Iterative Process. Communications of the ACM, volume 66, issue 5, pages 27–29, April 2023. doi:10.1145/3550069

 Logan Kugler. What Happens When Big Data Blunders? Communications of the ACM, volume 59, issue 6, pages 15–16, June 2016. doi:10.1145/2911975

 Miri Zilka. Algorithms and the criminal justice system: promises and challenges in deployment and research. At University of Cambridge Security Seminar Series, March 2023.

 Bill Davidow. Welcome to Algorithmic Prison. theatlantic.com, February 2014. Archived at archive.org

 Don Peck. They’re Watching You at Work. theatlantic.com, December 2013. Archived at perma.cc/YR9T-6M38

 Leigh Alexander. Is an Algorithm Any Less Racist Than a Human? theguardian.com, August 2016. Archived at perma.cc/XP93-DSVX

 Jesse Emspak. How a Machine Learns Prejudice. scientificamerican.com, December 2016. perma.cc/R3L5-55E6

 Rohit Chopra, Kristen Clarke, Charlotte A. Burrows, and Lina M. Khan. Joint Statement on Enforcement Efforts Against Discrimination and Bias in Automated Systems. ftc.gov, April 2023. Archived at perma.cc/YY4Y-RCCA

 Maciej Cegłowski. The Moral Economy of Tech. idlewords.com, June 2016. Archived at perma.cc/L8XV-BKTD

 Greg Nichols. Artificial Intelligence in healthcare is racist. zdnet.com, November 2020. Archived at perma.cc/3MKW-YKRS

 Cathy O’Neil. Weapons of Math Destruction: How Big Data Increases Inequality and Threatens Democracy. Crown Publishing, 2016. ISBN: 978-0-553-41881-1

 Julia Angwin. Make Algorithms Accountable. nytimes.com, August 2016. Archived at archive.org

 Bryce Goodman and Seth Flaxman. European Union Regulations on Algorithmic Decision-Making and a ‘Right to Explanation’. At ICML Workshop on Human Interpretability in Machine Learning, June 2016. Archived at arxiv.org/abs/1606.08813

 A Review of the Data Broker Industry: Collection, Use, and Sale of Consumer Data for Marketing Purposes. Staff Report, United States Senate Committee on Commerce, Science, and Transportation, commerce.senate.gov, December 2013. Archived at perma.cc/32NV-YWLQ

 Stephanie Assad, Robert Clark, Daniel Ershov, and Lei Xu. Algorithmic Pricing and Competition: Empirical Evidence from the German Retail Gasoline Market. Journal of Political Economy, volume 132, issue 3, pages 723-771, March 2024. doi:10.1086/726906

 Donella H. Meadows and Diana Wright. Thinking in Systems: A Primer. Chelsea Green Publishing, 2008. ISBN: 978-1-603-58055-7

 Daniel J. Bernstein. Listening to a “big data”/“data science” talk. Mentally translating “data” to “surveillance”: “...everything starts with surveillance...” x.com, May 2015. Archived at perma.cc/EY3D-WBBJ

 Marc Andreessen. Why Software Is Eating the World. a16z.com, August 2011. Archived at perma.cc/3DCC-W3G6

 J. M. Porup. ‘Internet of Things’ Security Is Hilariously Broken and Getting Worse. arstechnica.com, January 2016. Archived at archive.org

 Bruce Schneier. Data and Goliath: The Hidden Battles to Collect Your Data and Control Your World. W. W. Norton, 2015. ISBN: 978-0-393-35217-7

 The Grugq. Nothing to Hide. grugq.tumblr.com, April 2016. Archived at perma.cc/BL95-8W5M

 Federal Trade Commission. FTC Takes Action Against General Motors for Sharing Drivers’ Precise Location and Driving Behavior Data Without Consent. ftc.gov, January 2025. Archived at perma.cc/3XGV-3HRD

 Tony Beltramelli. Deep-Spying: Spying Using Smartwatch and Deep Learning. Masters Thesis, IT University of Copenhagen, December 2015. Archived at arxiv.org/abs/1512.05616

 Shoshana Zuboff. Big Other: Surveillance Capitalism and the Prospects of an Information Civilization. Journal of Information Technology, volume 30, issue 1, pages 75–89, April 2015. doi:10.1057/jit.2015.5

 Michiel Rhoen. Beyond Consent: Improving Data Protection Through Consumer Protection Law. Internet Policy Review, volume 5, issue 1, March 2016. doi:10.14763/2016.1.404

 Regulation (EU) 2016/679 of the European Parliament and of the Council of 27 April 2016. Official Journal of the European Union, L 119/1, May 2016.

 UK Information Commissioner’s Office. What is the ‘legitimate interests’ basis? ico.org.uk. Archived at perma.cc/W8XR-F7ML

 Tristan Harris. How a handful of tech companies control billions of minds every day. At TED2017, April 2017.

 Carina C. Zona. Consequences of an Insightful Algorithm. At GOTO Berlin, November 2016.

 Imanol Arrieta Ibarra, Leonard Goff, Diego Jiménez Hernández, Jaron Lanier, and E. Glen Weyl. Should We Treat Data as Labor? Moving Beyond ‘Free’. American Economic Association Papers Proceedings, volume 1, issue 1, December 2017.

 Bruce Schneier. Data Is a Toxic Asset, So Why Not Throw It Out? schneier.com, March 2016. Archived at perma.cc/4GZH-WR3D

 Cory Scott. Data is not toxic - which implies no benefit - but rather hazardous material, where we must balance need vs. want. x.com, March 2016. Archived at perma.cc/CLV7-JF2E

 Mark Pesce. Data is the new uranium – incredibly powerful and amazingly dangerous. theregister.com, November 2024. Archived at perma.cc/NV8B-GYGV

 Bruce Schneier. Mission Creep: When Everything Is Terrorism. schneier.com, July 2013. Archived at perma.cc/QB2C-5RCE

 Lena Ulbricht and Maximilian von Grafenstein. Big Data: Big Power Shifts? Internet Policy Review, volume 5, issue 1, March 2016. doi:10.14763/2016.1.406

 Ellen P. Goodman and Julia Powles. Facebook and Google: Most Powerful and Secretive Empires We’ve Ever Known. theguardian.com, September 2016. Archived at perma.cc/8UJA-43G6

 Judy Estrin and Sam Gill. The World Is Choking on Digital Pollution. washingtonmonthly.com, January 2019. Archived at perma.cc/3VHF-C6UC

 A. Michael Froomkin. Regulating Mass Surveillance as Privacy Pollution: Learning from Environmental Impact Statements. University of Illinois Law Review, volume 2015, issue 5, August 2015. Archived at perma.cc/24ZL-VK2T

 Pengyuan Wang, Li Jiang, and Jian Yang. The Early Impact of GDPR Compliance on Display Advertising: The Case of an Ad Publisher. Journal of Marketing Research, volume 61, issue 1, April 2023. doi:10.1177/00222437231171848

 Johnny Ryan. Don’t be fooled by Meta’s fine for data breaches. The Economist, May 2023. Archived at perma.cc/VCR6-55HR

 Jessica Leber. Your Data Footprint Is Affecting Your Life in Ways You Can’t Even Imagine. fastcompany.com, March 2016. Archived at archive.org

 Maciej Cegłowski. Haunted by Data. idlewords.com, October 2015. Archived at archive.org

 Sam Thielman. You Are Not What You Read: Librarians Purge User Data to Protect Privacy. theguardian.com, January 2016. Archived at archive.org

 Jez Humble. It’s a cliché that people get into tech to “change the world”. So then, you have to actually consider what the impact of your work is on the world. The idea that you can or should exclude societal and political discussions in tech is idiotic. It means you’re not doing your job. x.com, April 2021. Archived at perma.cc/3NYS-MHLC

search
Previous chapter 13. A Philosophy of Streaming Systems
Next chapter
Glossary

---

**Previous:** [Chapter 13](chapter13-streaming-philosophy.md) | **Next:** [Part 4 Coming Soon](#)
