await Promise.all(["minisearch"].map(name => import(name))); console.log("workspace imports: passed");
