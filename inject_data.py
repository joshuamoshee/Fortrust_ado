import pandas as pd
import os
import random

# 1. Define the Real Universities from your Document
# Source: Untitled document (2).docx
aus_unis = [
    "Australian National University", "Bond University", "Charles Darwin University",
    "Curtin University", "Deakin University", "Griffith University",
    "James Cook University", "La Trobe University", "Macquarie University",
    "Monash University", "Queensland University of Technology", "RMIT University",
    "Swinburne University of Technology", "University of Adelaide", "University of Melbourne",
    "University of New South Wales", "University of Queensland", "University of Sydney",
    "University of Technology Sydney", "University of Western Australia", "University of Wollongong",
    "Western Sydney University"
]

usa_unis = [
    "Arizona State University", "California State University Fresno", "Colorado State University",
    "De Paul University", "Florida Atlantic University", "George Mason University",
    "Georgia Institute of Technology", "Iowa State University", "Louisiana State University",
    "Oregon State University", "San Francisco State University", "Texas A&M University",
    "The Ohio State University", "UC Berkeley", "UC Davis", "UC Irvine", "UCLA",
    "University of Arizona", "University of Kansas", "University of Massachusetts Boston",
    "University of Michigan", "University of Southern California", "University of Washington",
    "University of Wisconsin-Madison", "Virginia Tech"
]

# 2. Define "Archetypes" to generate realistic (estimated) data
# We use these to fill in the missing financial/requirement data for the MVP
archetypes = {
    "AUS_Group8": {"tuition": (45000, 52000), "living": 30000, "gpa": 3.2, "ielts": 6.5, "vibe": "Prestigious"},
    "AUS_Modern": {"tuition": (30000, 40000), "living": 28000, "gpa": 2.8, "ielts": 6.0, "vibe": "Modern/Practical"},
    "USA_Public": {"tuition": (32000, 45000), "living": 20000, "gpa": 3.0, "ielts": 6.5, "vibe": "Public Ivy"},
    "USA_Private": {"tuition": (55000, 65000), "living": 22000, "gpa": 3.5, "ielts": 7.0, "vibe": "Elite Private"},
}

# 3. Build the Dataset
new_programs = []

# Process Australia
for uni in aus_unis:
    # Crude logic: "University of X" usually usually older/G8 style, others Modern
    type_key = "AUS_Group8" if "University of" in uni else "AUS_Modern"
    data = archetypes[type_key]
    
    # Create a Business variant
    new_programs.append({
        "country": "Australia", "city": "Multiple", "institution": uni,
        "level": "Bachelor", "category": "Business", "program_name": "Bachelor of Business",
        "tuition_per_year": random.randint(*data['tuition']), "living_per_year": data['living'],
        "duration_years": 3, "intake_months": "Feb,Jul",
        "ielts_min": data['ielts'], "gpa_min": data['gpa'], "visa_risk": "Low",
        "scholarship_level": "Medium", "vibe": data['vibe']
    })
    
    # Create an IT variant (since your persona 'Joshua' likes IT)
    new_programs.append({
        "country": "Australia", "city": "Multiple", "institution": uni,
        "level": "Bachelor", "category": "IT", "program_name": "Bachelor of Information Tech",
        "tuition_per_year": random.randint(*data['tuition']) + 2000, # IT slightly more expensive
        "living_per_year": data['living'],
        "duration_years": 3, "intake_months": "Feb,Jul",
        "ielts_min": data['ielts'], "gpa_min": data['gpa'], "visa_risk": "Low",
        "scholarship_level": "Medium", "vibe": data['vibe']
    })

# Process USA
for uni in usa_unis:
    type_key = "USA_Private" if "De Paul" in uni or "Southern California" in uni else "USA_Public"
    data = archetypes[type_key]
    
    new_programs.append({
        "country": "USA", "city": "USA", "institution": uni,
        "level": "Bachelor", "category": "General", "program_name": "Undergraduate Degree",
        "tuition_per_year": random.randint(*data['tuition']), "living_per_year": data['living'],
        "duration_years": 4, "intake_months": "Aug,Jan",
        "ielts_min": data['ielts'], "gpa_min": data['gpa'], "visa_risk": "Low",
        "scholarship_level": "High" if type_key == "USA_Private" else "Low",
        "vibe": data['vibe']
    })

# 4. Save to CSV
csv_path = "data/programs.csv"
df_new = pd.DataFrame(new_programs)

if os.path.exists(csv_path):
    df_existing = pd.read_csv(csv_path)
    # Combine and remove duplicates based on Institution Name
    df_combined = pd.concat([df_existing, df_new]).drop_duplicates(subset=["institution", "category"], keep='last')
else:
    df_combined = df_new

df_combined.to_csv(csv_path, index=False)
print(f"✅ Successfully injected {len(df_new)} programs. Total database size: {len(df_combined)} rows.")