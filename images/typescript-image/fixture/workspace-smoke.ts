await Promise.all(["sharp"].map(name => import(name))); console.log("workspace imports: passed");
