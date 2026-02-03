import pandas as pd

# 1. The Raw List from your Doc
us_universities = [
    "California State University, Fresno", "California State University, San Marcos",
    "Colorado State University", "De Paul University", "Florida Atlantic University",
    "George Mason University", "Illinois State University", "Iowa State University",
    "Oregon State University", "San Francisco State University", "Texas A&M University",
    "The Ohio State University", "University of Arizona", "UC DAVIS", "UC IRVINE",
    "UC SANTA BARBARA", "University of Kansas", "University of Massachusetts Boston",
    "University of Wisconsin - Madison", "Virginia Tech", "Western Washington University"
]

# 2. Create "Safe MVP" Data (Averages)
# We assume $35k tuition and $18k living for public unis to prevent the AI from crashing
programs = []
for uni in us_universities:
    programs.append({
        "country": "USA",
        "city": "Unknown",  # You can fill this later
        "institution": uni,
        "level": "Bachelor",
        "category": "General",
        "program_name": "Undergraduate Degree (General)",
        "tuition_per_year": 35000, 
        "living_per_year": 18000,
        "duration_years": 4,
        "intake_months": "Aug,Jan",
        "ielts_min": 6.5,
        "gpa_min": 3.0,
        "visa_risk": "Low",
        "scholarship_level": "Medium",
        "vibe": "Public University"
    })

# 3. Save to CSV
df = pd.DataFrame(programs)
# Append to your existing file (mode='a') or create new
df.to_csv("data/programs.csv", mode='a', header=False, index=False)
print("Added US universities to database!")