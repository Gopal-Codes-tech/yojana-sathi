"""Indian states / UTs with Hindi names (used by the UI and for voice matching)."""

STATES = [
    ("Andhra Pradesh", "आंध्र प्रदेश"), ("Arunachal Pradesh", "अरुणाचल प्रदेश"),
    ("Assam", "असम"), ("Bihar", "बिहार"), ("Chhattisgarh", "छत्तीसगढ़"),
    ("Goa", "गोवा"), ("Gujarat", "गुजरात"), ("Haryana", "हरियाणा"),
    ("Himachal Pradesh", "हिमाचल प्रदेश"), ("Jharkhand", "झारखंड"),
    ("Karnataka", "कर्नाटक"), ("Kerala", "केरल"), ("Madhya Pradesh", "मध्य प्रदेश"),
    ("Maharashtra", "महाराष्ट्र"), ("Manipur", "मणिपुर"), ("Meghalaya", "मेघालय"),
    ("Mizoram", "मिज़ोरम"), ("Nagaland", "नागालैंड"), ("Odisha", "ओडिशा"),
    ("Punjab", "पंजाब"), ("Rajasthan", "राजस्थान"), ("Sikkim", "सिक्किम"),
    ("Tamil Nadu", "तमिलनाडु"), ("Telangana", "तेलंगाना"), ("Tripura", "त्रिपुरा"),
    ("Uttar Pradesh", "उत्तर प्रदेश"), ("Uttarakhand", "उत्तराखंड"),
    ("West Bengal", "पश्चिम बंगाल"),
    ("Andaman and Nicobar Islands", "अंडमान और निकोबार द्वीप समूह"),
    ("Chandigarh", "चंडीगढ़"),
    ("Dadra and Nagar Haveli and Daman and Diu", "दादरा और नगर हवेली व दमन और दीव"),
    ("Delhi", "दिल्ली"), ("Jammu and Kashmir", "जम्मू और कश्मीर"),
    ("Ladakh", "लद्दाख"), ("Lakshadweep", "लक्षद्वीप"), ("Puducherry", "पुडुचेरी"),
]

STATE_NAMES = {en for en, _ in STATES}
