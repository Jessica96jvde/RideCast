import csv
from pathlib import Path


# --------------------------------------------------
# PROJECT PATHS
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

STOP_MASTER = PROJECT_ROOT / "dataset" / "data" / "stop_master.csv"
OUTPUT_FILE = PROJECT_ROOT / "dataset" / "data" / "route_stops.csv"


# --------------------------------------------------
# VERIFIED ROUTE STOP SEQUENCES
# --------------------------------------------------

ROUTES = {

    # Route 45
    # Ukkadam → Vellamadai
    "S45": [
        "Ukkadam",
        "Prakasam",
        "Raja Street",
        "Manikoondu / Town Hall",
        "Railway Station",
        "Collector Office",
        "D.S.P. Office",
        "Oriental Insurance",
        "C.S.I. Immanuel Church",
        "C.S.I. School",
        "V.O.C. Park",
        "Park Gate",
        "Gandhipuram Town",
        "G.P. Hospital",
        "Lakshmipuram",
        "Tex Tool / Velan Theatre",
        "Ganapathy",
        "Surya Hospital",
        "C.M.S. School",
        "Athipalayam Junction",
        "Bharathi Nagar",
        "Ramakrishna Mill",
        "L.G.B. Nagar",
        "Sivanandha Mills",
        "Anandha Kumar Mills",
        "S.R.P. Mills",
        "Amman Kovil",
        "G.K.S. Nagar",
        "Kalapatti Pirivu",
        "Saravanampatti",
        "Viswasapuram",
        "Karattumedu",
        "P.P.G. It",
        "S.N.S. College / Valiyampalayam Pirivu",
        "S.N.S. College",
        "Sri Village Nagar",
        "Kurumbapalayam",
        "Kodia Park",
        "Info Institute of Engineering",
        "Kovilpalayam",
        "S.S. Kulam",
        "V.J. Nagar",
        "Kottaipalayam",
        "C.S.I. Colony",
        "Agrahara Samakulam",
        "Thottipalayam",
        "Vellamadai",
    ],


    # Route 57
    # Ukkadam → Vellamadai
    "S57": [
        "Ukkadam",
        "Prakasam",
        "Raja Street",
        "Five Corner",
        "Manikoondu / Town Hall",
        "Railway Station",
        "Collector Office",
        "D.S.P. Office",
        "Oriental Insurance",
        "C.S.I. Immanuel Church",
        "C.S.I. School",
        "V.O.C. Park",
        "Park Gate",
        "G.P. Hospital",
        "Lakshmipuram",
        "Tex Tool / Velan Theatre",
        "Ganapathy",
        "Surya Hospital",
        "C.M.S. School",
        "Athipalayam Junction",
        "Bharathi Nagar",
        "Ramakrishna Mill",
        "L.G.B. Nagar",
        "Sivanandha Mills",
        "Anandha Kumar Mills",
        "S.R.P. Mills",
        "Amman Kovil",
        "G.K.S. Nagar",
        "Kalapatti Pirivu",
        "Saravanampatti",
        "Viswasapuram",
        "Karattumedu",
        "P.P.G. It",
        "S.N.S. College / Valiyampalayam Pirivu",
        "S.N.S. College",
        "Sri Village Nagar",
        "Kurumbapalayam",
        "Kodia Park",
        "Info Institute of Engineering",
        "Kovilpalayam",
        "S.S. Kulam",
        "V.J. Nagar",
        "Kottaipalayam",
        "Agrahara Samakulam",
        "Thottipalayam",
        "Vellamadai",
    ],


    # Route 33A
    # Gandhipuram → Kinathukadavu
    "S33A": [
        "Gandhipuram Town Bus Stand",
        "Park Gate",
        "Christ The King Church",
        "C.S.I. Immanuel Church",
        "D.S.P. Office",
        "Collector Office",
        "Railway Station",
        "Town Hall",
        "Ukkadam",
        "Karumbukadai",
        "Athupalam",
        "Kurichi Pirivu",
        "Kurichi Pirivu Housing Unit",
        "Iyer Hospital",
        "Sundarapuram",
        "Gandhi Nagar",
        "L.I.C. Colony",
        "Sidco",
        "K.P.M. Matriculation School",
        "Rathinam College",
        "Eachanari",
        "Karpagam University",
        "Ganesh Nagar",
        "Malumichampatti Junction",
        "Malumichampatti",
        "Hindustan College",
        "Othakal Mandapam",
        "Karpagam Medical College & Hospital",
        "Premier Mills",
        "Polytechnic College",
        "Mailrapalayam",
        "Kinathukadavu Check Post",
        "Arulmigu Velayutha Swamy Temple",
        "Kinathukadavu",
    ],


    # Route 48
    # Gandhipuram Town Bus Stand → Vanthavalam
    "S48": [
        "Gandhipuram Town Bus Stand",
        "Park Gate",
        "V.O.C. Park",
        "C.S.I. School",
        "C.S.I. Immanuel Church",
        "D.S.P. Office",
        "Collector Office",
        "Railway Station",
        "Town Hall",
        "Ukkadam",
        "Karumbukadai",
        "Athupalam",
        "Kuniyamuthur High School",
        "Kuniyamuthur",
        "Nehru College",
        "Edayarpalayam Pirivu",
        "Kuniyamuthur Police Station",
        "B.K. Pudur",
        "Kovaipudur Pirivu",
        "Milekal",
        "Gandhi Nagar",
        "Madukkarai Police Station",
        "Madukkarai Union Office",
        "Marappalam",
        "Chettipalayam Pirivu",
        "Indian Bank",
        "Thirumalayampalayam Pirivu",
        "K.G. Chavadi",
        "Pichanur",
        "Vanthavalam",
    ],
}


# --------------------------------------------------
# HELPER
# --------------------------------------------------

def normalize(text):
    """
    Makes comparison easier by ignoring:
    - uppercase/lowercase differences
    - extra spaces
    """
    return " ".join(text.strip().lower().split())


# --------------------------------------------------
# LOAD STOP MASTER
# --------------------------------------------------

def load_stop_master():

    stop_lookup = {}

    with open(
        STOP_MASTER,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            stop_id = row["stop_id"].strip()
            stop_name = row["stop_name"].strip()

            stop_lookup[normalize(stop_name)] = stop_id

    return stop_lookup


# --------------------------------------------------
# CREATE ROUTE STOPS
# --------------------------------------------------

def create_route_stops():

    stop_lookup = load_stop_master()

    rows = []

    for service_id, stops in ROUTES.items():

        print(f"\nProcessing {service_id}...")

        for order, stop_name in enumerate(stops, start=1):

            key = normalize(stop_name)

            if key not in stop_lookup:

                raise ValueError(
                    f"\nERROR: Stop not found in stop_master.csv\n"
                    f"Route: {service_id}\n"
                    f"Stop: {stop_name}\n\n"
                    f"Add this stop to stop_master.csv before running again."
                )

            stop_id = stop_lookup[key]

            rows.append({
                "service_id": service_id,
                "stop_order": order,
                "stop_id": stop_id
            })

    # Write output file
    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
        newline=""
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=[
                "service_id",
                "stop_order",
                "stop_id"
            ]
        )

        writer.writeheader()
        writer.writerows(rows)

    print("\n--------------------------------")
    print("route_stops.csv created successfully!")
    print("--------------------------------")
    print(f"Total records: {len(rows)}")
    print(f"Saved to: {OUTPUT_FILE}")


# --------------------------------------------------
# RUN
# --------------------------------------------------

if __name__ == "__main__":
    create_route_stops()