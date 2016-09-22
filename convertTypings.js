const fs = require('fs');
if (!fs.existsSync("./typings.json")) {
  console.log("NO typings.json found");
  return
}
const typings = require('./typings.json');
const devNames = ["devDependencies", "globalDevDependencies"]
const names = devNames.concat("dependencies", "globalDependencies")
const alwaysInstallAsDev = false
const promises = []
names.forEach(n => {
  const gd = typings[n]
  if (gd) {
    promises.push.apply(promises, searchDependencies(gd, n));
  }
})

Promise.all(promises).then(results => {
  //console.log(results)
  return Promise.all(results.map(r => {
      return npmInstall(r, alwaysInstallAsDev || devNames.indexOf(r.type) > -1)
  }))
}).then(oks => {
  oks.forEach(ok => {
    if (ok.ok) {
      delete typings[ok.res.type][ok.res.module]
    }
  })
  fs.writeFileSync("./typings.json", JSON.stringify(typings, null, 2))
}).catch(e => {
  console.log("ERROR", e);
})

function searchDependencies(deps, type) {
  return Object.keys(deps).map(d => {
    return npmInfo(d).then(moduleName => {
      return {module: d, npm: moduleName, type}
    })
  })
}


function npmInfo(moduleName) {
  return new Promise((res, rej) => {
    const spawn = require('child_process').spawn;
    const npmInfo = spawn('npm', ['info', '@types/' + moduleName, 'name']);
    var npm = null
    npmInfo.stdout.on('data', (data) => {
      npm = data.toString()
    });

    npmInfo.stderr.on('data', (data) => {
      console.log(`ERR: ${moduleName} ${data}`);
    });
    npmInfo.on('close', (code) => {
      res(npm)
    });
  })
}

function npmInstall(res, dev) {
  return new Promise((r) => {
    if (!res.npm) {
      console.log(`Cannot find npm @types for ${res.module}!`);
      r({res, ok: false})
      return;
    }
    const spawn = require('child_process').spawn;
    const installType = dev ? "-SD" : "-S";
    console.log(`npm i ${res.npm} ${installType}`);
    const npmInfo = spawn('npm', ['i', res.npm, installType]);
    var result = true;
    npmInfo.stderr.on('data', (data) => {
      result = false
    });
    npmInfo.on('close', (code) => {
      r({res, ok: result && code === 0})
    });
  })
}
