from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

pdf_path = 'Confidential_Q3_Strategic_Financial_Audit.pdf'
doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54)

styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontSize=18,
    leading=22,
    textColor=colors.HexColor('#0F172A'),
    spaceAfter=6
)
badge_style = ParagraphStyle(
    'Badge',
    parent=styles['Normal'],
    fontSize=9,
    leading=11,
    textColor=colors.HexColor('#DC2626'),
    fontName='Helvetica-Bold',
    spaceAfter=12
)
h2_style = ParagraphStyle(
    'Heading2',
    parent=styles['Heading2'],
    fontSize=12,
    leading=16,
    textColor=colors.HexColor('#0D9488'),
    spaceBefore=10,
    spaceAfter=6
)
body_style = ParagraphStyle(
    'Body',
    parent=styles['Normal'],
    fontSize=10,
    leading=14,
    textColor=colors.HexColor('#334155'),
    spaceAfter=6
)
code_style = ParagraphStyle(
    'Code',
    parent=styles['Normal'],
    fontSize=8.5,
    leading=12,
    fontName='Courier',
    textColor=colors.HexColor('#0F172A'),
    backColor=colors.HexColor('#F1F5F9'),
    borderColor=colors.HexColor('#CBD5E1'),
    borderWidth=1,
    borderPadding=6,
    spaceAfter=8
)

story = []
story.append(Paragraph('CONFIDENTIAL &amp; PROPRIETARY — FOR BOARD REVIEW ONLY', badge_style))
story.append(Paragraph('Vanguard Global Holdings — Q3 Financial Audit &amp; M&amp;A Feasibility', title_style))
story.append(Paragraph('<b>Date:</b> November 14, 2026 &nbsp;&nbsp;|&nbsp;&nbsp; <b>Authors:</b> Elena Rostova (CFO), David Chen (General Counsel)', body_style))
story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=14))

story.append(Paragraph('1. Executive Financial Position &amp; Budget Allocations', h2_style))
story.append(Paragraph('Our total Q3 operational expenditure is authorized at <b>$14,850,000</b>. The restructuring contingency reserve stands at <b>$3,200,000</b>, leaving <b>$22,800,000</b> in unrestricted cash balances. Annualized operational synergies are modeled at <b>$18,400,000</b> by fiscal year-end 2027.', body_style))

story.append(Paragraph('2. Executive Compensation Commitments', h2_style))
story.append(Paragraph('Under current board-approved employment contracts, CEO Victoria Vance receives a base salary of <b>$850,000</b> and an approved performance bonus of <b>$1,450,000</b>. CTO Marcus Brody has an annual base compensation of <b>$490,000</b> with equity vesting valued at <b>$320,000</b>.', body_style))

story.append(Paragraph('3. Target Acquisition Parameters (Project Nightingale)', h2_style))
story.append(Paragraph('We are authorizing an all-cash acquisition ceiling of <b>$115,000,000</b> for target entity Aetherion Cloud Systems. Transition advisors estimate closing adjustments will require an additional <b>$4,500,000</b> in escrow.', body_style))

story.append(Paragraph('4. Master Infrastructure &amp; Database Credentials', h2_style))
story.append(Paragraph('The production database credential for data migration must be restricted immediately:', body_style))
story.append(Paragraph('postgresql://sec_admin:sk-vault-998877665544332211@prod-db.vanguard.internal:5432/core_finances', code_style))
story.append(Paragraph('Emergency incident response contact: <b>Elena Rostova</b> (email: <i>e.rostova@vanguard-nexus.com</i>, phone: <i>+1-555-019-7744</i>).', body_style))

story.append(Paragraph('5. Required Executive Actions', h2_style))
story.append(Paragraph('Please analyze the total capital exposure of the $14,850,000 budget and the $115,000,000 acquisition bid, assess the credential vulnerability, and formulate 3 strategic recommendations for the upcoming board meeting.', body_style))

doc.build(story)
print('PDF generated successfully at:', pdf_path)
