import type { GlossaryContentMap } from "./types";

export const enGlossaryContent: GlossaryContentMap = {
  "pojemnik-euro": {
    slug: "pojemnik-euro",
    term: "Euro container",
    shortDefinition: "A standardized plastic transport and storage container dimensioned to fit optimally on a standard Euro pallet.",
    definition: [
      "Euro containers (also known as Euro stacking containers) are fundamental load units in warehouse logistics, retail distribution, and industrial manufacturing. Their external dimensions are strictly standardized based on the 1200x800 mm logistic module (the footprint of a standard Euro pallet), enabling optimal space utilization during transport and storage.",
      "They are typically manufactured from high-density polyethylene (HDPE) or polypropylene (PP), ensuring excellent mechanical strength, crack resistance, and durability against acids, oils, and alkalis. The robust structural design allows safe stacking of loaded containers without risking damage to the contents."
    ],
    applications: [
      "Parts storage and transport along manufacturing assembly lines",
      "Order picking and packing in distribution centers and e-commerce hubs",
      "Automated small parts storage systems (AS/RS mini-load systems)",
      "Safe food-grade transport and handling (using certified food-safe versions)"
    ],
    synonyms: ["Euro stacking box", "Euro crate", "Plastic Euro container"],
    relatedTerms: ["transport-wewnetrzny", "kompletacja-zamowien"],
    relatedCategories: ["pojemniki-plastikowe-euro"],
    faq: [
      {
        question: "What is the difference between a reinforced base and a standard base in Euro containers?",
        answer: "A reinforced base (such as a ribbed or double base) prevents sagging under heavy point loads. This feature is critical in automated warehouses and roller conveyor systems, where any base deflection could jam the transport system."
      },
      {
        question: "Are Euro containers suitable for automated industrial washing?",
        answer: "Yes, PP and HDPE plastics are highly resistant to the water temperatures typically used in industrial automatic washing systems (up to +80°C) as well as standard chemical cleaning agents."
      }
    ]
  },
  "regal-paletowy": {
    slug: "regal-paletowy",
    term: "Pallet racking",
    shortDefinition: "A heavy-duty storage system designed to safely store palletized goods in a multi-level layout.",
    definition: [
      "Pallet racking systems (primarily selective single-deep racks) form the structural backbone of most modern warehouses. They provide direct access to every single pallet (100% accessibility principle) and allow warehouses to maximize their vertical space. The system consists of vertical steel frames and horizontal load beams on which the pallets rest.",
      "Designing and installing selective pallet racking requires strict adherence to safety standards (such as EN 15635), regular technical inspections, and the implementation of column protectors and barrier guards to shield the uprights from forklift impacts."
    ],
    applications: [
      "Multi-level high-bay warehouses and logistics hubs",
      "Building material distributors and industrial wholesalers",
      "Buffer zones and staging areas in shipping docks",
      "Cold storage facilities requiring optimal cubic space utilization"
    ],
    synonyms: ["High-bay racking", "Selective pallet rack", "Industrial racking"],
    relatedTerms: ["nosnosc-regalu", "transport-wewnetrzny"],
    relatedCategories: ["regaly-i-systemy-skladowania"],
    faq: [
      {
        question: "What are the most common types of pallet rack damage?",
        answer: "The most common damage occurs on the lower parts of the vertical uprights and diagonal bracing, typically caused by forklift collisions during maneuvering. Implementing heavy-duty column protectors is essential to minimize this risk."
      },
      {
        question: "Is it permissible to alter beam levels on a pallet rack independently?",
        answer: "No, modifying the height of load levels alters the load distribution and stability calculation of the rack. Any changes require approval from the manufacturer or recalculation of the structural load capacities by an engineer."
      }
    ]
  },
  "antresola-magazynowa": {
    slug: "antresola-magazynowa",
    term: "Warehouse mezzanine",
    shortDefinition: "A free-standing steel structure that creates additional raised floor levels above the main floor, increasing usable space without building expansion.",
    definition: [
      "A warehouse mezzanine (also referred to as a structural steel work platform) is an advanced system designed to utilize the vertical space of high-ceilinged industrial halls. It creates additional floor levels that can accommodate picking zones, packing areas, assembly lines, or office spaces.",
      "The structure is supported by steel columns, primary beams, and secondary purlins. The decking is commonly made of heavy-duty particle boards (such as P5 tongue-and-groove boards, often fire-retardant) or steel gratings, which allow light and air flow and facilitate the performance of sprinkler systems."
    ],
    applications: [
      "Increasing picking zones in e-commerce fulfillment centers (multi-tier structures)",
      "Temporary staging and storage areas for light or bulky goods",
      "Creating overhead assembly lines or manufacturing work zones",
      "Building modular offices or breakrooms on the mezzanine floor inside production halls"
    ],
    synonyms: ["Industrial mezzanine", "Storage platform", "Steel work platform"],
    relatedTerms: ["kompletacja-zamowien", "stol-pakowy"],
    relatedCategories: ["antresole-i-podesty-magazynowe"],
    faq: [
      {
        question: "Does the installation of a steel mezzanine require a building permit?",
        answer: "Free-standing, demountable steel mezzanines anchored only to the slab are typically classified as warehouse equipment rather than a permanent building expansion. Therefore, they often do not require a full building permit, though they must comply with fire safety regulations and require floor loading verification."
      },
      {
        question: "What is the typical load capacity of a warehouse mezzanine?",
        answer: "Mezzanine load capacities generally range from 250 kg/m² to 1000 kg/m² and are engineered specifically based on the intended use, such as hand pallet truck traffic, shelving layouts, or heavy equipment."
      }
    ]
  },
  "stol-pakowy": {
    slug: "stol-pakowy",
    term: "Packing table",
    shortDefinition: "An ergonomic workstation equipped with integrated holders for packing materials, designed to streamline parcel inspection and packing.",
    definition: [
      "Packing tables and packing workstations are essential components of shipping areas in distribution centers, particularly in e-commerce logistics. They are designed to minimize order processing times and reduce worker fatigue through ergonomic layouts, such as height adjustment and immediate access to accessories.",
      "The modular design of these stations allows customization for specific packing workflows. Standard accessories include overhead shelves for cardboard cartons, roll dispensers for bubble wrap or paper, brackets for monitors and label printers, and integrated LED task lighting."
    ],
    applications: [
      "Courier shipping and parcel packing stations in e-commerce fulfillment",
      "Quality control inspection points prior to customer shipping",
      "Assembly and packaging workstations in manufacturing plants",
      "Consolidation and sorting hubs in courier terminals"
    ],
    synonyms: ["Packing station", "Pack table", "Parcel packing bench"],
    relatedTerms: ["pojemnik-euro", "kompletacja-zamowien"],
    relatedCategories: ["stoly-pakowe-i-kompletacyjne"],
    faq: [
      {
        question: "What are the optimal dimensions for a packing table countertop?",
        answer: "The most common sizes are 1600 to 1800 mm in width and 800 mm in depth. This space comfortably accommodates large shipping boxes while keeping packing materials within easy, ergonomic reach."
      },
      {
        question: "Why should a packing station feature height adjustability?",
        answer: "Height adjustment (especially electric) allows the workstation to be tailored to the height of individual operators and supports sitting, standing, or sit-to-stand operations, reducing spinal strain and improving efficiency."
      }
    ]
  },
  "wozek-widlowy": {
    slug: "wozek-widlowy",
    term: "Forklift truck",
    shortDefinition: "A powered industrial vehicle equipped with a mast and forks to lift, transport, and stack palletized loads.",
    definition: [
      "Forklift trucks (also referred to as industrial counterbalanced lift trucks) are critical material handling machines used in warehouses, ports, manufacturing plants, and construction yards. Their primary benefit is the ability to lift heavy loads vertically to high elevations and maneuver precisely within confined aisle spaces.",
      "Depending on the power source, forklifts are divided into internal combustion engine trucks (LPG, Diesel) for outdoor operations, and quiet, emission-free electric trucks (lead-acid or modern Li-Ion batteries) for indoor use. Specialized variants, such as Reach Trucks or Very Narrow Aisle (VNA) system trucks, can service pallet racks at heights exceeding 12 meters."
    ],
    applications: [
      "Unloading and loading truck trailers, shipping containers, and flatbeds",
      "High-bay pallet rack operations (storing and retrieving unit loads)",
      "Horizontal transport of goods across large warehouse floors",
      "Order picking at high elevations using specialized picking platforms"
    ],
    synonyms: ["Forklift", "Lift truck", "Fork truck"],
    relatedTerms: ["transport-wewnetrzny", "regal-paletowy"],
    relatedCategories: ["wozki-i-transport-wewnetrzny"],
    faq: [
      {
        question: "What characterizes a Reach Truck compared to a standard forklift?",
        answer: "A Reach Truck (high-reach warehouse truck) features a mast that extends forward, allowing it to retrieve pallets and operate in much narrower working aisles (often less than 2.9 meters wide) than classic counterbalanced trucks."
      },
      {
        question: "Why are lithium-ion batteries replacing lead-acid batteries in electric forklifts?",
        answer: "Li-Ion batteries require zero maintenance (no water refilling), do not release gases during charging (eliminating the need for dedicated charging rooms), and support opportunity charging during short breaks."
      }
    ]
  },
  "nosnosc-regalu": {
    slug: "nosnosc-regalu",
    term: "Rack load capacity",
    shortDefinition: "The maximum allowable load weight that a racking structure can support per beam level or per entire upright frame column.",
    definition: [
      "Rack load capacity is a fundamental safety parameter in industrial warehousing. It is categorized into beam level capacity (the maximum weight that can be placed on a single pair of load beams or shelf) and bay capacity (the total maximum combined weight of all levels between two adjacent vertical upright frames).",
      "Load capacities must be clearly displayed on load signs (load charts) installed at the end of each racking row. Overloading is a severe safety hazard that can cause structural failure and collapse. Calculations are based on static, uniformly distributed loads (UDL)."
    ],
    applications: [
      "Designing and engineering racking systems according to specific load weights",
      "Verifying structural safety parameters during annual expert inspections",
      "Planning optimal storage layouts in the warehouse based on pallet weights"
    ],
    synonyms: ["Safe working load", "Shelf load capacity", "Frame load capacity"],
    relatedTerms: ["regal-paletowy"],
    relatedCategories: ["regaly-i-systemy-skladowania"],
    faq: [
      {
        question: "What does UDL mean in the context of warehouse racking?",
        answer: "UDL stands for Uniformly Distributed Load, meaning the weight is spread evenly across the entire surface of the shelf or load beams. Racks are engineered specifically for UDL; concentrated point loads drastically reduce structural capacity."
      },
      {
        question: "Where should rack load capacity signs be positioned?",
        answer: "Load signs must be permanently mounted in prominent, highly visible locations at the end of every racking block or aisle, according to the EN 15635 standard."
      }
    ]
  },
  "kompletacja-zamowien": {
    slug: "kompletacja-zamowien",
    term: "Order picking",
    shortDefinition: "The process of retrieving specific items from storage locations to fulfill a customer order.",
    definition: [
      "Order picking is one of the most labor-intensive and costly processes in warehouse logistics, often accounting for up to 50-60% of total warehouse operating costs. It involves retrieving items from inventory in quantities specified by a customer order and delivering them to the packing and shipping zone.",
      "Picking methods range from standard 'picker-to-goods' (where operators travel through the warehouse aisles) to automated 'goods-to-picker' (using conveyor systems, shuttles, or robots to bring goods to the workstation). Optimization technologies such as Pick-by-Light, Voice Picking, or WMS-calculated picking paths are used to increase throughput."
    ],
    applications: [
      "Fulfillment of retail and consumer orders in e-commerce logistics",
      "Assembly and kitting of components in the automotive and electronics industries",
      "B2B distribution of grocery and pharmaceutical orders to retail chains"
    ],
    synonyms: ["Picking", "Item picking", "Stock picking"],
    relatedTerms: ["pojemnik-euro", "stol-pakowy"],
    relatedCategories: ["pojemniki-plastikowe-euro", "stoly-pakowe-i-kompletacyjne"],
    faq: [
      {
        question: "What is the difference between single-stage picking and two-stage picking?",
        answer: "In single-stage picking, the operator collects items directly for one specific order. In two-stage (batch) picking, the operator collects the total sum of items for multiple orders at once, and then divides them in a sorting zone into individual customer shipments."
      },
      {
        question: "How does a Warehouse Management System (WMS) optimize picking times?",
        answer: "A WMS automatically calculates the shortest picking path, minimizes empty travel distance, batches orders with similar profiles, and guides workers through the optimal retrieval sequence."
      }
    ]
  },
  "transport-wewnetrzny": {
    slug: "transport-wewnetrzny",
    term: "Internal transport",
    shortDefinition: "The movement of raw materials, work-in-progress, and finished goods within a single industrial or warehouse facility.",
    definition: [
      "Internal transport (also called material handling or intralogistics) encompasses all processes related to moving goods within the boundaries of a facility. It integrates receiving, storage, production, and shipping, using a wide range of auxiliary handling equipment.",
      "The intralogistics infrastructure ranges from simple manual equipment (such as hand pallet jacks) to complex automated systems, including roller and belt conveyors, vertical lifts, and driverless vehicles (AGVs/AMRs) capable of autonomous navigation."
    ],
    applications: [
      "Transporting raw materials from receiving docks to manufacturing lines",
      "Transferring picked orders to packing and consolidation zones",
      "Automatic handling of pallets on multi-tier mezzanines using vertical lifts",
      "Cross-docking and pallet staging in dock areas"
    ],
    synonyms: ["Intralogistics", "Material handling", "Material flow"],
    relatedTerms: ["wozek-widlowy", "pojemnik-euro"],
    relatedCategories: ["wozki-i-transport-wewnetrzny"],
    faq: [
      {
        question: "What is the difference between Autonomous Mobile Robots (AMRs) and traditional AGVs?",
        answer: "AMRs navigate independently using built-in maps and sensors, allowing them to dynamically bypass obstacles. Traditional AGVs (Automated Guided Vehicles) follow pre-defined tracks (like magnetic tape) and stop in front of obstacles until they are removed."
      },
      {
        question: "What are the primary benefits of automating internal material transport?",
        answer: "Automation enables a continuous 24/7 material flow, eliminates human error, significantly reduces workplace accidents, and lowers operational costs associated with manual material handling."
      }
    ]
  }
};
