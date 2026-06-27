#!/usr/bin/env python3
"""Génère le rapport de remise à partir des preuves produites localement."""

from __future__ import annotations

import json
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "rapport-biblioflow.pdf"
GREEN = colors.HexColor("#235B4E")
INK = colors.HexColor("#17342E")
CORAL = colors.HexColor("#EE775B")
LIME = colors.HexColor("#C7DF73")
PAPER = colors.HexColor("#F6F3EC")
MUTED = colors.HexColor("#687A75")
LINE = colors.HexColor("#DCDed5")


def read_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return fallback


def test_summary():
    path = ROOT / "reports" / "junit.xml"
    try:
        root = ET.parse(path).getroot()
        return {
            "tests": int(root.attrib.get("tests", 0)),
            "failures": int(root.attrib.get("failures", 0)),
            "errors": int(root.attrib.get("errors", 0)),
            "time": float(root.attrib.get("time", 0)),
        }
    except (FileNotFoundError, ET.ParseError, ValueError):
        return {"tests": 0, "failures": 0, "errors": 0, "time": 0}


def audit_summary():
    result = subprocess.run(
        ["npm", "audit", "--json"], cwd=ROOT, capture_output=True, text=True, check=False
    )
    try:
        metadata = json.loads(result.stdout).get("metadata", {})
        return metadata.get("vulnerabilities", {})
    except json.JSONDecodeError:
        return {}


def command_ok(command):
    return subprocess.run(command, cwd=ROOT, capture_output=True, check=False).returncode == 0


def architecture_drawing():
    drawing = Drawing(470, 260)

    def box(x, y, width, height, title, subtitle, fill):
        drawing.add(Rect(x, y, width, height, rx=8, ry=8, fillColor=fill, strokeColor=LINE))
        drawing.add(String(x + width / 2, y + height - 22, title, textAnchor="middle", fontName="Helvetica-Bold", fontSize=10, fillColor=INK))
        drawing.add(String(x + width / 2, y + 15, subtitle, textAnchor="middle", fontName="Helvetica", fontSize=8, fillColor=MUTED))

    def arrow(x1, y1, x2, y2):
        drawing.add(Line(x1, y1, x2, y2, strokeColor=GREEN, strokeWidth=1.5))
        drawing.add(Polygon([x2, y2, x2 - 7, y2 + 4, x2 - 7, y2 - 4], fillColor=GREEN, strokeColor=GREEN))

    box(15, 100, 90, 55, "Front Web", "Nginx :8080", colors.white)
    box(185, 175, 120, 60, "API Catalogue", "Controller > Service > Data", LIME)
    box(185, 45, 120, 60, "API Emprunts", "Controller > Service > Data", colors.HexColor("#F7D9D1"))
    box(380, 175, 80, 60, "PostgreSQL", "catalogue", colors.white)
    box(380, 45, 80, 60, "PostgreSQL", "emprunts", colors.white)
    arrow(105, 138, 185, 205)
    arrow(105, 118, 185, 75)
    arrow(305, 205, 380, 205)
    arrow(305, 75, 380, 75)
    arrow(245, 105, 245, 175)
    drawing.add(String(255, 137, "REST", fontName="Helvetica-Bold", fontSize=8, fillColor=CORAL))
    return drawing


def metric_table(metrics):
    rows = [["Mesure", "Résultat", "Seuil CI", "État"]]
    thresholds = {"statements": 90, "branches": 85, "functions": 90, "lines": 90}
    labels = {"statements": "Instructions", "branches": "Branches", "functions": "Fonctions", "lines": "Lignes"}
    for key in ("statements", "branches", "functions", "lines"):
        value = float(metrics.get(key, {}).get("pct", 0))
        rows.append([labels[key], f"{value:.2f} %", f">= {thresholds[key]} %", "OK" if value >= thresholds[key] else "ÉCHEC"])
    table = Table(rows, colWidths=[5.2 * cm, 3.2 * cm, 3.2 * cm, 2.4 * cm])
    table.setStyle(base_table_style())
    return table


def base_table_style():
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), GREEN),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, LINE),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PAPER]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]
    )


def add_footer(canvas, document):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(2 * cm, 1.35 * cm, A4[0] - 2 * cm, 1.35 * cm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(2 * cm, 0.95 * cm, "BiblioFlow - Rapport DevOps")
    canvas.drawRightString(A4[0] - 2 * cm, 0.95 * cm, str(document.page))
    canvas.restoreState()


def build_report():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=38, leading=42, textColor=INK, alignment=TA_CENTER, spaceAfter=16))
    styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontSize=15, leading=22, textColor=MUTED, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name="H1Green", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=23, leading=28, textColor=GREEN, spaceAfter=16))
    styles.add(ParagraphStyle(name="H2Ink", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=INK, spaceBefore=13, spaceAfter=7))
    styles.add(ParagraphStyle(name="BodyFR", parent=styles["BodyText"], fontName="Helvetica", fontSize=10, leading=15, textColor=INK, spaceAfter=8))
    styles.add(ParagraphStyle(name="SmallMuted", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.5, leading=12, textColor=MUTED))

    coverage = read_json(ROOT / "coverage" / "coverage-summary.json", {}).get("total", {})
    tests = test_summary()
    eslint = read_json(ROOT / "reports" / "eslint.json", [])
    lint_errors = sum(item.get("errorCount", 0) for item in eslint)
    lint_warnings = sum(item.get("warningCount", 0) for item in eslint)
    audit = audit_summary()
    vulnerabilities = sum(audit.values()) if audit else 0
    compose_valid = command_ok(["docker", "compose", "config", "--quiet"])
    integration = read_json(ROOT / "reports" / "integration.json", {})

    story = [Spacer(1, 3.3 * cm), Paragraph("BiblioFlow", styles["CoverTitle"]), Paragraph("Projet DevOps - Application distribuée de gestion de bibliothèque", styles["CoverSub"]), Spacer(1, 1.1 * cm)]
    cover_data = [["Auteur", "Issa Kane"], ["Formation", "Projet DevOps"], ["Version", "1.0.0"], ["Date", "27 juin 2026"]]
    cover = Table(cover_data, colWidths=[4 * cm, 8.5 * cm])
    cover.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, -1), GREEN), ("TEXTCOLOR", (0, 0), (0, -1), colors.white), ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"), ("GRID", (0, 0), (-1, -1), 0.5, LINE), ("ROWBACKGROUNDS", (1, 0), (1, -1), [colors.white, PAPER]), ("TOPPADDING", (0, 0), (-1, -1), 11), ("BOTTOMPADDING", (0, 0), (-1, -1), 11)]))
    story.extend([cover, Spacer(1, 2 * cm), Paragraph("Dépôt Git - Pipeline CI - Architecture en couches - Deux backends Docker - Tests - Couverture - Qualité", styles["SmallMuted"]), PageBreak()])

    story.extend([Paragraph("1. Synthèse du projet", styles["H1Green"]), Paragraph("BiblioFlow répond au cahier des charges avec deux microservices Node.js indépendants. Le Catalogue gère les livres et leur stock. Le service Emprunts gère le cycle de vie des prêts et appelle le Catalogue par HTTP. Une interface web Nginx expose les deux API sous une origine unique.", styles["BodyFR"])])
    compliance = [["Exigence", "Preuve dans le projet"], ["Dépôt et CI", "GitHub et .github/workflows/ci.yml"], ["Architecture en couches", "data / services / controllers dans chaque API"], ["Deux services back", "catalog-api et loan-api dans Docker Compose"], ["Tests et mocks web", f"{tests['tests']} tests Vitest, Supertest et mock du client HTTP"], ["Couverture", f"{coverage.get('lines', {}).get('pct', 0):.2f} % des lignes"], ["Qualité", f"ESLint: {lint_errors} erreur, {lint_warnings} avertissement"], ["Bonus", "Front web responsive et deux bases PostgreSQL"]]
    table = Table(compliance, colWidths=[5 * cm, 10 * cm])
    table.setStyle(base_table_style())
    story.extend([Spacer(1, 0.4 * cm), table, PageBreak()])

    story.extend([Paragraph("2. Architecture logicielle", styles["H1Green"]), architecture_drawing(), Spacer(1, 0.3 * cm), Paragraph("Architecture interne de chaque backend", styles["H2Ink"]), Paragraph("Controller : routes Express, validation Zod et codes HTTP. Service : règles métier, orchestration inter-service et compensation. Data : SQL paramétré et accès exclusif à PostgreSQL.", styles["BodyFR"]), Paragraph("Le service Emprunts ne lit jamais la base Catalogue. Cette frontière rend les services déployables et testables séparément. Une réservation de stock est compensée si l'écriture de l'emprunt échoue ; le retour applique la stratégie inverse.", styles["BodyFR"]), PageBreak()])

    story.extend([Paragraph("3. Conteneurisation et exploitation", styles["H1Green"]), Paragraph("Docker Compose orchestre cinq conteneurs. Les bases possèdent des volumes distincts et des healthchecks PostgreSQL. Les API attendent une base saine ; l'API Emprunts attend aussi le Catalogue. Nginx attend les deux API et publie le port 8080.", styles["BodyFR"])])
    containers = [["Conteneur", "Rôle", "Dépendance"], ["web", "Interface et reverse proxy", "catalog-api, loan-api"], ["catalog-api", "Catalogue REST", "catalog-db"], ["loan-api", "Emprunts REST", "loan-db, catalog-api"], ["catalog-db", "Données des livres", "-"], ["loan-db", "Données des emprunts", "-"]]
    containers_table = Table(containers, colWidths=[3.5 * cm, 6 * cm, 5.5 * cm])
    containers_table.setStyle(base_table_style())
    story.extend([containers_table, Spacer(1, 0.5 * cm), Paragraph(f"Validation Docker Compose : <b>{'OK' if compose_valid else 'ÉCHEC'}</b>. Les images API utilisent Node.js 22 Alpine et s'exécutent avec l'utilisateur non-root node.", styles["BodyFR"]), PageBreak()])

    story.extend([Paragraph("4. Tests automatisés", styles["H1Green"]), Paragraph(f"Le rapport JUnit contient <b>{tests['tests']} tests</b>, {tests['failures']} échec et {tests['errors']} erreur. Les tests couvrent toutes les couches et sont exécutés en moins d'une seconde sur la machine de génération.", styles["BodyFR"])])
    test_matrix = [["Couche", "Type de vérification"], ["Data", "Requêtes SQL, paramètres, valeurs absentes et résultats"], ["Services", "Règles métier, erreurs, concurrence et compensations"], ["Controllers", "Routes réelles avec Supertest, validation et erreurs HTTP"], ["Inter-service", "Client Catalogue avec réponses HTTP et pannes réseau simulées"], ["Configuration", "Ports, variables obligatoires et pool PostgreSQL"]]
    test_table = Table(test_matrix, colWidths=[4 * cm, 11 * cm])
    test_table.setStyle(base_table_style())
    story.extend([test_table, Spacer(1, 0.5 * cm), Paragraph("Les controllers sont testés comme de vraies applications HTTP sans ouvrir de port. Le client inter-service accepte une implémentation fetch injectée : les tests simulent succès, erreur JSON, réponse invalide et panne réseau sans dépendance externe.", styles["BodyFR"]), PageBreak()])

    story.extend([Paragraph("5. Couverture du code", styles["H1Green"]), Paragraph("La CI bloque la fusion si un seuil global n'est pas atteint. Les fichiers de démarrage, qui ne contiennent que le câblage et la gestion des signaux, sont exclus ; toutes les règles métier et couches applicatives restent mesurées.", styles["BodyFR"]), metric_table(coverage), Spacer(1, 0.5 * cm), Paragraph("Le détail navigable est produit dans coverage/index.html et le résumé machine dans coverage/coverage-summary.json.", styles["BodyFR"]), PageBreak()])

    story.extend([Paragraph("6. Qualité logicielle et CI", styles["H1Green"])])
    quality = [["Contrôle", "Résultat"], ["ESLint", f"{lint_errors} erreur / {lint_warnings} avertissement"], ["Prettier", "Format vérifié dans la CI"], ["npm audit", f"{vulnerabilities} vulnérabilité déclarée"], ["Tests et couverture", "Seuils bloquants"], ["Docker Compose", "Configuration et build vérifiés"], ["Test E2E Docker", "Emprunt et retour validés" if integration.get("status") == "passed" else "Non exécuté"], ["Dependabot", "npm, GitHub Actions et Docker surveillés"]]
    quality_table = Table(quality, colWidths=[6 * cm, 9 * cm])
    quality_table.setStyle(base_table_style())
    story.extend([quality_table, Spacer(1, 0.5 * cm), Paragraph("Le workflow GitHub Actions exécute deux jobs parallèles : Qualité et tests d'une part, validation et construction des images Docker d'autre part. Les permissions sont limitées à la lecture du dépôt et les jobs ont un délai maximal.", styles["BodyFR"]), Paragraph("Mesures complémentaires : validation stricte des entrées, SQL paramétré, stock non négatif garanti par SQL, limite de corps JSON, en-têtes Helmet, politique CSP Nginx et messages d'erreur internes masqués.", styles["BodyFR"]), PageBreak()])

    story.extend([Paragraph("7. Utilisation", styles["H1Green"]), Paragraph("Démarrage complet : <font name='Courier'>docker compose up --build</font>, puis ouverture de <font name='Courier'>http://localhost:8080</font>. Les données de démonstration sont créées de façon idempotente au premier démarrage.", styles["BodyFR"])])
    endpoints = [["Méthode", "Route", "Usage"], ["GET", "/api/books", "Catalogue"], ["POST", "/api/books", "Nouveau livre"], ["PATCH", "/api/books/:id/stock", "Stock atomique"], ["GET", "/api/loans", "Emprunts"], ["POST", "/api/loans", "Nouvel emprunt"], ["POST", "/api/loans/:id/return", "Retour"]]
    endpoint_table = Table(endpoints, colWidths=[2.5 * cm, 6 * cm, 6.5 * cm])
    endpoint_table.setStyle(base_table_style())
    story.extend([endpoint_table, Spacer(1, 0.5 * cm), Paragraph("La documentation contractuelle complète se trouve dans docs/openapi.yaml. Le README décrit le démarrage local, les commandes de qualité et les décisions de fiabilité.", styles["BodyFR"]), PageBreak()])

    story.extend([Paragraph("8. Preuve Google Labs", styles["H1Green"])])
    evidence = next((path for path in [ROOT / "docs/evidence/google-labs.png", ROOT / "docs/evidence/google-labs.jpg", ROOT / "docs/evidence/google-labs.jpeg"] if path.exists()), None)
    if evidence:
        image = Image(str(evidence))
        max_width, max_height = 16 * cm, 20 * cm
        ratio = min(max_width / image.imageWidth, max_height / image.imageHeight)
        image.drawWidth = image.imageWidth * ratio
        image.drawHeight = image.imageHeight * ratio
        story.extend([Paragraph("Capture fournie par l'étudiant et intégrée sans altération.", styles["BodyFR"]), image])
    else:
        warning_title = ParagraphStyle(name="WarningTitle", parent=styles["BodyFR"], fontName="Helvetica-Bold", textColor=colors.white, alignment=TA_CENTER, spaceAfter=0)
        warning_body = ParagraphStyle(name="WarningBody", parent=styles["BodyFR"], textColor=INK, alignment=TA_CENTER, spaceAfter=0)
        warning = Table([[Paragraph("CAPTURE PERSONNELLE NON FOURNIE", warning_title)], [Paragraph("Déposer la preuve sous docs/evidence/google-labs.png puis régénérer le rapport.", warning_body)]], colWidths=[15 * cm])
        warning.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), CORAL), ("BACKGROUND", (0, 1), (0, 1), colors.HexColor("#FBE7E2")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 14), ("BOTTOMPADDING", (0, 0), (-1, -1), 14), ("GRID", (0, 0), (-1, -1), 0.5, LINE)]))
        story.extend([Paragraph("Cette preuve dépend du compte Google personnel de l'étudiant et ne peut pas être fabriquée par le projet.", styles["BodyFR"]), warning])

    document = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm, topMargin=1.8 * cm, bottomMargin=1.8 * cm, title="Rapport DevOps BiblioFlow", author="Issa Kane")
    document.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    return OUTPUT


if __name__ == "__main__":
    print(build_report())
