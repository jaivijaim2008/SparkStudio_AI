"""
Certificate Extraction and LinkedIn Post Generator Service for CreatorPilot / SparkStudio AI.
"""

from typing import Dict, Any, Optional
import re
import logging

logger = logging.getLogger("creatorpilot.certificate")

class CertificateService:
    @staticmethod
    def extract_certificate_info(filename: str, raw_text: str = "", user_notes: str = "") -> Dict[str, Any]:
        """
        Extract certificate metadata from filename, raw text content, or user notes.
        """
        combined_source = f"{filename} {raw_text} {user_notes}".strip()
        
        # 1. Infer Title
        title = "Professional Certification"
        title_patterns = [
            r"certificate\s+of\s+completion\s+in\s+([A-Za-z0-9\s\-\+\#\.]+)",
            r"certified\s+([A-Za-z0-9\s\-\+\#\.]+)",
            r"([A-Za-z0-9\s\-\+\#\.]+)\s+certificate",
            r"([A-Za-z0-9\s\-\+\#\.]+)\s+specialization",
            r"([A-Za-z0-9\s\-\+\#\.]+)\s+course"
        ]
        for pat in title_patterns:
            m = re.search(pat, combined_source, re.IGNORECASE)
            if m:
                found = m.group(1).strip()
                if len(found) > 3 and len(found) < 80:
                    title = found.title()
                    break
        
        # Fallback title heuristics from filename
        clean_name = re.sub(r'[\-_]', ' ', filename.rsplit('.', 1)[0])
        if title == "Professional Certification" and len(clean_name) > 3:
            clean_title = re.sub(r'\b(cert|certificate|final|pdf|png|jpg|jpeg|doc|docx)\b', '', clean_name, flags=re.IGNORECASE).strip()
            if clean_title:
                title = clean_title.title()

        # 2. Infer Issuing Organization
        issuer = "Recognized Institution"
        known_issuers = [
            "AWS", "Amazon Web Services", "Coursera", "Udemy", "edX", "Stanford", "Google Cloud", 
            "Google", "Meta", "IBM", "Microsoft", "DeepLearning.AI", "Harvard", "LinkedIn Learning",
            "Oracle", "Cisco", "DataCamp", "Codecademy", "FreeCodeCamp", "Scrum Alliance"
        ]
        for org in known_issuers:
            if re.search(r'\b' + re.escape(org) + r'\b', combined_source, re.IGNORECASE):
                issuer = org
                break

        # 3. Infer Completion Date
        date_match = re.search(r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b', combined_source, re.IGNORECASE)
        if not date_match:
            date_match = re.search(r'\b\d{4}\b', combined_source)
        completion_date = date_match.group(0) if date_match else "Recently"

        # 4. Infer Skills
        skills = []
        skill_keywords = [
            "Python", "Data Science", "Machine Learning", "Artificial Intelligence", "Deep Learning",
            "Cloud Computing", "AWS", "DevOps", "Docker", "Kubernetes", "React", "Next.js", "TypeScript",
            "Node.js", "Full Stack Development", "SQL", "Cybersecurity", "UI/UX Design", "Project Management",
            "Agile", "Digital Marketing", "Prompt Engineering", "NLP", "Computer Vision"
        ]
        for kw in skill_keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', combined_source, re.IGNORECASE):
                skills.append(kw)
        
        if not skills:
            skills = ["Problem Solving", "Industry Best Practices", "Domain Expertise"]

        achievements = f"Completed comprehensive training and practical evaluations in {', '.join(skills[:3])}."

        return {
            "certificate_title": title,
            "issuing_organization": issuer,
            "completion_date": completion_date,
            "skills": skills[:5],
            "achievements": achievements
        }

    @staticmethod
    def generate_linkedin_post(extracted_info: Dict[str, Any], custom_tone: str = "Professional") -> str:
        """
        Generate a polished, highly engaging professional LinkedIn post.
        """
        title = extracted_info.get("certificate_title", "Professional Certification")
        issuer = extracted_info.get("issuing_organization", "Leading Institution")
        skills = extracted_info.get("skills", ["Key Industry Competencies"])
        
        skills_bullet = "\n".join([f"• {s}" for s in skills])

        base_hashtags = ["#Certification", "#Learning", "#ProfessionalDevelopment", "#CareerGrowth"]
        skill_hashtags = [f"#{re.sub(r'[^A-Za-z0-9]', '', s)}" for s in skills[:3] if s]
        issuer_hashtag = f"#{re.sub(r'[^A-Za-z0-9]', '', issuer)}" if issuer != "Recognized Institution" else ""
        
        all_hashtags = list(dict.fromkeys(base_hashtags + skill_hashtags + ([issuer_hashtag] if issuer_hashtag else [])))
        hashtags_str = " ".join(all_hashtags)

        post = (
            f"🎉 Excited to share a new milestone in my professional journey!\n\n"
            f"I have officially earned my certification in {title} from {issuer}! 🎓✨\n\n"
            f"This program provided deep insights and hands-on experience, strengthening my capability to solve complex challenges and deliver high-impact results.\n\n"
            f"💡 Key Skills & Core Takeaways:\n"
            f"{skills_bullet}\n\n"
            f"A heartfelt thank you to {issuer} and the instructors for offering such an exceptional learning experience. Looking forward to applying these skills to create real value!\n\n"
            f"{hashtags_str}"
        )
        return post
