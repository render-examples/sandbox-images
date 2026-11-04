await Promise.all(["autoevals", "zod"].map(name => import(name))); console.log("workspace imports: passed");
