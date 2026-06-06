from pathlib import Path

root = Path(__file__).resolve().parents[1]
p = root / "src/pages/Landing.jsx"
text = p.read_text(encoding="utf-8")

s = text.find("<style>") + 7
e = text.find("</style>")
css = text[s:e].strip()
(root / "src/styles").mkdir(parents=True, exist_ok=True)
(root / "src/styles/landing-v2.css").write_text(css, encoding="utf-8")

s2 = text.find('<script type="text/babel">') + len('<script type="text/babel">')
e2 = text.find("</script>", s2)
js = text[s2:e2].strip()
js = js.replace("ReactDOM.createRoot(document.getElementById('root')).render(<App/>);", "").strip()

header = """import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/landing-v2.css';

"""
js = js.replace("const {useState,useEffect,useRef} = React;", "")
js = js.replace("function App()", "export default function LandingPage()")

(root / "src/components/landing/v2").mkdir(parents=True, exist_ok=True)
(root / "src/components/landing/v2/LandingPage.jsx").write_text(header + js, encoding="utf-8")
print("extracted", len(css), "css chars,", len(js), "js chars")
