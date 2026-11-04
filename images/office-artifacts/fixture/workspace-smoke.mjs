await Promise.all(["exceljs", "docx", "pptxgenjs", "adm-zip", "fast-xml-parser"].map(name => import(name))); console.log("workspace imports: passed");
