import io
import csv
from typing import List, Dict, Any
from datetime import datetime
from PIL import Image, ImageDraw
import ezdxf

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing, Rect, Polygon as PDFPolygon, String

def generate_dxf_layout(width: float, height: float, shapes: List[Dict[str, Any]]) -> str:
    """Generates a raw DXF CAD nesting layout using ezdxf."""
    doc = ezdxf.new('R2010')
    msp = doc.modelspace()
    
    # Draw boundary sheet (Color 1 is Red)
    msp.add_lwpolyline([(0, 0), (width, 0), (width, height), (0, height)], dxfattribs={'close': True, 'color': 1})
    
    # Draw nested shapes (Color 3 is Green)
    for shape in shapes:
        points = shape.get("points", [])
        if len(points) >= 3:
            msp.add_lwpolyline(points, dxfattribs={'close': True, 'color': 3})
            
    out_stream = io.StringIO()
    doc.write(out_stream)
    return out_stream.getvalue()

def generate_svg_layout(width: float, height: float, shapes: List[Dict[str, Any]]) -> str:
    """Generates a raw SVG vector CAD nesting layout."""
    svg_parts = []
    svg_parts.append(f'<svg viewBox="0 0 {width} {height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">')
    # Background sheet
    svg_parts.append(f'  <rect width="{width}" height="{height}" fill="#0f172a" stroke="#1e293b" stroke-width="2" />')
    
    # Grid patterns overlay
    grid_spacing = 50.0
    x_steps = int(width / grid_spacing) + 1
    y_steps = int(height / grid_spacing) + 1
    for i in range(x_steps):
        svg_parts.append(f'  <line x1="{i*grid_spacing}" y1="0" x2="{i*grid_spacing}" y2="{height}" stroke="rgba(255,255,255,0.03)" stroke-width="0.5" />')
    for j in range(y_steps):
        svg_parts.append(f'  <line x1="0" y1="{j*grid_spacing}" x2="{width}" y2="{j*grid_spacing}" stroke="rgba(255,255,255,0.03)" stroke-width="0.5" />')
        
    # Render placed shapes
    for idx, shape in enumerate(shapes):
        points = shape.get("points", [])
        pts_str = " ".join([f"{pt[0]},{pt[1]}" for pt in points])
        
        # Color palettes cycling for premium CAD look
        color_cycles = ["#06b6d4", "#a855f7", "#10b981", "#fbbf24", "#3b82f6"]
        color = color_cycles[idx % len(color_cycles)]
        
        svg_parts.append(f'  <polygon points="{pts_str}" fill="{color}1c" stroke="{color}" stroke-width="1" />')
        
        # Draw centroid text
        if len(points) > 0:
            xs = [p[0] for p in points]
            ys = [p[1] for p in points]
            cx = sum(xs) / len(points)
            cy = sum(ys) / len(points)
            label = shape.get("id", "").split("_")[0]
            svg_parts.append(f'  <text x="{cx}" y="{cy}" fill="#f8fafc" font-family="monospace" font-size="7" text-anchor="middle" dominant-baseline="middle">{label}</text>')
            
    svg_parts.append('</svg>')
    return "\n".join(svg_parts)

def generate_png_preview(width: float, height: float, shapes: List[Dict[str, Any]]) -> bytes:
    """Renders nesting layout vector nodes to a PNG binary byte stream using Pillow."""
    # Scale units to pixels (default 5x scaling factor for sharp resolution)
    scale = 5.0
    img_w = int(width * scale)
    img_h = int(height * scale)
    
    # Enforce safe sizing boundaries
    img_w = max(100, min(img_w, 4000))
    img_h = max(100, min(img_h, 4000))
    
    img = Image.new("RGBA", (img_w, img_h), (15, 23, 42, 255)) # Dark blue-grey #0f172a
    draw = ImageDraw.Draw(img)
    
    # Draw CAD grids
    grid_spacing = int(50.0 * scale)
    for x in range(0, img_w, grid_spacing):
        draw.line([(x, 0), (x, img_h)], fill=(255, 255, 255, 10))
    for y in range(0, img_h, grid_spacing):
        draw.line([(0, y), (img_w, y)], fill=(255, 255, 255, 10))

    # Draw shapes
    for idx, shape in enumerate(shapes):
        points = shape.get("points", [])
        scaled_points = [(p[0] * scale, p[1] * scale) for p in points]
        
        color_cycles = [
            ((6, 182, 212, 40), (6, 182, 212, 255)),    # Cyan
            ((168, 85, 247, 40), (168, 85, 247, 255)),  # Purple
            ((16, 185, 129, 40), (16, 185, 129, 255)),  # Emerald
            ((251, 191, 36, 40), (251, 191, 36, 255)),  # Gold
            ((59, 130, 246, 40), (59, 130, 246, 255))   # Blue
        ]
        fill_color, stroke_color = color_cycles[idx % len(color_cycles)]
        
        if len(scaled_points) >= 3:
            draw.polygon(scaled_points, fill=fill_color, outline=stroke_color)
            
    # Write to buffer
    output = io.BytesIO()
    img.save(output, format="PNG")
    return output.getvalue()

def generate_csv_statistics(job: Any) -> str:
    """Generates detailed CSV audit report listing nesting statistics."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["PATTERN OPTIMA - NESTING ENGINE REPORT LOG"])
    writer.writerow([])
    writer.writerow(["Metric Parameter", "Value"])
    writer.writerow(["Job Identifier", f"Ref #{job.id}"])
    writer.writerow(["Job Project Name", job.name])
    writer.writerow(["Algorithm Applied", job.algorithm_used])
    writer.writerow(["Execution Duration (sec)", f"{round(job.processing_time, 3)} sec"])
    writer.writerow(["Fabric Width (cm)", f"{job.fabric_width} cm"])
    writer.writerow(["Fabric Height (cm)", f"{job.fabric_height} cm"])
    writer.writerow(["Total Fabric Area (sqm)", f"{round((job.fabric_width * job.fabric_height)/10000, 3)} m²"])
    writer.writerow(["Nesting Yield (Fabric Utilization %)", f"{job.utilization_percentage}%"])
    writer.writerow(["Waste Reduction Ratio %", f"{job.waste_percentage}%"])
    writer.writerow(["Material Saved (sqm)", f"{job.saved_area} m²"])
    writer.writerow(["Estimated Savings (USD)", f"${job.saved_money}"])
    writer.writerow(["Nesting Timestamp", job.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")])
    
    return output.getvalue()

def generate_pdf_report(job: Any) -> bytes:
    """Generates a highly polished PDF auditing card with embedded ReportLab layouts."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom SaaS style titles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=colors.HexColor('#020617'), # Slate 950
        spaceAfter=15
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#475569'), # Slate 600
        leading=14
    )

    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=15,
        spaceAfter=10
    )

    story = []
    
    # 1. Header Title Block
    story.append(Paragraph("PATTERN OPTIMA", ParagraphStyle('SubLogo', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#2563eb'), spaceAfter=2)))
    story.append(Paragraph("AI Nesting Efficiency Audit Report", title_style))
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} • Job Reference Ref #{job.id}", body_style))
    story.append(Spacer(1, 15))
    
    # 2. Statistics Grid Table
    data = [
        [Paragraph("<b>Audit Parameter</b>", body_style), Paragraph("<b>Nesting Engine Output Metric</b>", body_style)],
        ["Nesting Optimization ID", f"Ref #{job.id}"],
        ["Nesting Configuration Name", job.name],
        ["Algorithm Solver Used", job.algorithm_used],
        ["Processing Compute Time", f"{round(job.processing_time, 3)} seconds"],
        ["Fabric Roll Dimensions", f"{job.fabric_width} cm x {job.fabric_height} cm"],
        ["Nesting Yield (Fabric Utilization)", f"{job.utilization_percentage}%"],
        ["Layout Waste Ratio %", f"{job.waste_percentage}%"],
        ["Calculated Material Saved", f"{job.saved_area} m²"],
        ["Estimated Costs Saved", f"${job.saved_money} USD"],
    ]
    
    t = Table(data, colWidths=[200, 340])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('BOTTOMPADDING', (0,1), (-1,-1), 5),
        ('TOPPADDING', (0,1), (-1,-1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))
    
    # 3. Embedded Layout Drawing Visual
    story.append(Paragraph("CAD Layout Visualizer Preview", h2_style))
    
    # Draw nested shapes on a canvas
    # Page width is 612pt. Margins are 36pt. Available width is 540pt.
    dw = 540.0
    dh = 200.0
    draw = Drawing(dw, dh)
    
    # Draw background sheet
    draw.add(Rect(0, 0, dw, dh, fillColor=colors.HexColor('#0f172a'), strokeColor=colors.HexColor('#334155'), strokeWidth=1))
    
    # Scale coordinates to fit visual drawing box
    shapes_list = job.optimized_layout or []
    if shapes_list:
        fw = job.fabric_width
        fh = job.fabric_height
        scale_x = dw / (fw or 1.0)
        scale_y = dh / (fh or 1.0)
        scale = min(scale_x, scale_y)
        
        for idx, shape in enumerate(shapes_list):
            pts = shape.get("points", [])
            flat_pts = []
            for p in pts:
                flat_pts.append(p[0] * scale)
                # Flip Y coordinate for PDF drawing coords system
                flat_pts.append(dh - (p[1] * scale))
                
            color_cycles = [
                colors.HexColor('#06b6d4'),
                colors.HexColor('#a855f7'),
                colors.HexColor('#10b981'),
                colors.HexColor('#fbbf24'),
                colors.HexColor('#3b82f6')
            ]
            fill_c = color_cycles[idx % len(color_cycles)]
            
            if len(flat_pts) >= 6:
                draw.add(PDFPolygon(flat_pts, fillColor=fill_c, strokeColor=fill_c, strokeWidth=0.5))
                
    story.append(draw)
    story.append(Spacer(1, 15))
    
    # 4. Footer Audit Disclaimers
    story.append(Paragraph("<b>Notice:</b> This report is generated dynamically by Pattern Optima's computational packing engine. Calculations are based on exact coordinates and layout optimization bounds.", ParagraphStyle('FooterDesc', fontName='Helvetica-Oblique', fontSize=8, textColor=colors.HexColor('#94a3b8'))))
    
    doc.build(story)
    return buffer.getvalue()
