const fs = require('fs');
let content = fs.readFileSync('app/debug/page.tsx', 'utf8');

// Quitamos el objeto badge que causa conflicto con el tipado de React.CSSProperties
content = content.replace(/badge: \(v: number\) => \(\{[\s\S]*?\}\),/, '');

// Y para que no de error si se usa en el JSX, forzamos que el estilo sea inline
content = content.replace(/style={styles\.badge\((.*?)\)}/g, 'style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: "bold", background: $1 >= 7 ? "#d4edda" : $1 >= 5 ? "#fff3cd" : "#f8d7da", color: $1 >= 7 ? "#155724" : $1 >= 5 ? "#856404" : "#721c24" }}');

fs.writeFileSync('app/debug/page.tsx', content);
