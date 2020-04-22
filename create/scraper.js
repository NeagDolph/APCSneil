var { Cluster } = require('puppeteer-cluster');
var config = require("./config.js");
var fs = require('fs');
// Imports puppeteer, config, and file system

var treeObject = {};
// Initializing treeObject

//
(async () => {
  config.urls.forEach((url) => {
    treeObject[url] = {crawled: false, children: {}}
  })

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 5,
    puppeteerOptions: {
      headless: true,
    }
  });
  await cluster.task(async ({ page, data: url }) => {
    await page.goto(url);

    let hostname = new URL(url).hostname

    let outwardlinks = await page.$$eval("a", nodes => nodes.map(el => el.href))
    
    return outwardlinks.reduce((obj, el) => {
      if (el.includes(hostname)) { 
        return {...obj, [el]: {crawled: false, children: {}}}
      } else {
        return obj
      }
      
    });
  });


  let entries = Object.entries(treeObject)

    
  for (let index = 0; index < entries.length; index++) {
    treeObject[entries[index][0]].crawled = true
    treeObject[entries[index][0]].children = await cluster.execute(entries[index][0])
  }

  fs.writeFileSync("data.json", JSON.stringify(treeObject))

  await cluster.idle();
  await cluster.close();
})();