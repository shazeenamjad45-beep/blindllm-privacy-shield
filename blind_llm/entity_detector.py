import re
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

@dataclass
class DetectedEntity:
    entity_id: str
    original_text: str
    placeholder: str
    category: str  # FINANCIAL, PERSON, CREDENTIAL, IDENTIFIER, CONTACT, CUSTOM
    start_idx: int
    end_idx: int

class EntityDetector:
    """
    Local privacy scanner for detecting sensitive data before cloud transmission.
    Zero cloud network calls. All detection runs strictly client-side.
    """

    PATTERNS = [
        # 1. Financial / Currency figures ($500k, $450,000, 12.5M USD, €120,000, £95k)
        ("FINANCIAL", re.compile(r'(\$|€|£|¥)\s*\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:k|m|b|million|billion|usd|eur|gbp))?|\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:USD|EUR|GBP|dollars|euros|pounds)\b', re.IGNORECASE)),
        
        # 2. API Keys, Tokens, Passwords, Secrets (e.g. sk-..., bearer..., ghp_..., 32+ hex/base64)
        ("CREDENTIAL", re.compile(r'\b(?:sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{30,}|bearer\s+[a-zA-Z0-9_.-]{20,}|password\s*[:=]\s*\S+|api[_-]?key\s*[:=]\s*\S+)\b', re.IGNORECASE)),
        
        # 3. Emails
        ("CONTACT", re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')),
        
        # 4. Phone numbers
        ("CONTACT", re.compile(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')),
        
        # 5. Dates / Timestamps associated with confidential milestones
        ("DATE", re.compile(r'\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b', re.IGNORECASE)),
        
        # 6. Specific High-Profile Identifiers (Project names, IP, SSN)
        ("IDENTIFIER", re.compile(r'\b(?:project\s+[A-Za-z0-9_-]+|codename\s+[A-Za-z0-9_-]+|\b\d{3}-\d{2}-\d{4}\b)\b', re.IGNORECASE)),
    ]

    @classmethod
    def scan(cls, text: str, custom_terms: Optional[List[str]] = None) -> Tuple[List[DetectedEntity], str]:
        """
        Scans input text, identifies sensitive spans, generates token tags,
        and returns both the entity metadata and the blinded placeholder prompt.
        """
        entities: List[DetectedEntity] = []
        occupied_spans: List[Tuple[int, int]] = []

        # 1. First check user-defined custom sensitive terms
        if custom_terms:
            for term in custom_terms:
                term_clean = term.strip()
                if not term_clean:
                    continue
                pattern = re.compile(re.escape(term_clean), re.IGNORECASE)
                for match in pattern.finditer(text):
                    s, e = match.span()
                    if not cls._overlaps(s, e, occupied_spans):
                        occupied_spans.append((s, e))
                        entities.append(DetectedEntity(
                            entity_id="",
                            original_text=match.group(0),
                            placeholder="",
                            category="CUSTOM",
                            start_idx=s,
                            end_idx=e
                        ))

        # 2. Automatically detect person / candidate names (from headers or executive titles)
        person_names = set()
        clean_lines = [l.strip() for l in text.splitlines() if l.strip()]
        for l in clean_lines[:8]:
            l_clean = re.sub(r'^(?:Name|Candidate|Applicant|Author|Profile|Engineer|Resume)\s*[:\-—]\s*', '', l, flags=re.IGNORECASE).strip()
            if re.match(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$', l_clean):
                if l_clean.lower() not in (
                    "document context", "user inquiry", "executive summary",
                    "work experience", "technical skills", "education history", "cover letter"
                ):
                    person_names.add(l_clean)

        for m in re.finditer(r'\b(?:CEO|CTO|CFO|COO|CIO|VP|President|Director|Manager|Lead|Founder|Candidate|Dr\.|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b', text):
            person_names.add(m.group(1))

        for pname in sorted(person_names, key=len, reverse=True):
            p_pattern = re.compile(r'\b' + re.escape(pname) + r'\b', re.IGNORECASE)
            for match in p_pattern.finditer(text):
                s, e = match.span()
                if not cls._overlaps(s, e, occupied_spans):
                    occupied_spans.append((s, e))
                    entities.append(DetectedEntity(
                        entity_id="",
                        original_text=match.group(0),
                        placeholder="",
                        category="PERSON",
                        start_idx=s,
                        end_idx=e
                    ))

        # 3. Check built-in regex categories
        for category, pattern in cls.PATTERNS:
            for match in pattern.finditer(text):
                s, e = match.span()
                if not cls._overlaps(s, e, occupied_spans):
                    occupied_spans.append((s, e))
                    entities.append(DetectedEntity(
                        entity_id="",
                        original_text=match.group(0),
                        placeholder="",
                        category=category,
                        start_idx=s,
                        end_idx=e
                    ))

        # Sort entities by appearance in text
        entities.sort(key=lambda x: x.start_idx)

        # Assign clean, standardized placeholder tokens
        for idx, ent in enumerate(entities, 1):
            ent.entity_id = f"ent_{idx}"
            ent.placeholder = f"[{ent.category}_{idx}]"

        # Construct the blinded string by replacing spans from right to left
        blinded_text = text
        for ent in sorted(entities, key=lambda x: x.start_idx, reverse=True):
            blinded_text = blinded_text[:ent.start_idx] + ent.placeholder + blinded_text[ent.end_idx:]

        return entities, blinded_text

    @staticmethod
    def _overlaps(start: int, end: int, spans: List[Tuple[int, int]]) -> bool:
        for s, e in spans:
            if max(start, s) < min(end, e):
                return True
        return False
