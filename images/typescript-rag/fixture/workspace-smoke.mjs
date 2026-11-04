await Promise.all(["@langchain/core/documents", "@langchain/textsplitters"].map(name => import(name))); console.log("workspace imports: passed");
