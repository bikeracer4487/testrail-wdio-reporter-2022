"use strict";
/// <reference types="node" />

const WDIOReporter = require("@wdio/reporter").default;
const axios = require('axios');
//const async = require('async');
//const { skipPartiallyEmittedExpressions } = require("typescript");
let runId,
  params,
  resp;
let waitFinish = true;
let resultsForIT = [];
let testCasesIDs = [];

function sleep(duration) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, duration * 1000)
  })
}

function getObject(case_id, status_id, comment, defect) {
  return {
    "case_id": case_id,
    "status_id": status_id,
    "comment": comment,
  };
};

function getTime() {
  let time = new Date();
  let time_string = `${time.getHours}:${time.getMinutes()}:${time.getSeconds}`;
  return time_string;
}

function getRunStatus () {
  try {
    return axios.get(
      `https://${params.domain}/index.php?/api/v2/get_run/${runId}`,
      {
        headers: {
            'Content-Type': 'application/json',
        },
        auth: {
          username: params.username,
          password: params.apiToken,
        },
      },
    )
  }
  catch(error) {
    // handle error
    console.error(error);
  }
}

const updateTestRunResults = async () => {
  // Check if there are any results to push
  if (resultsForIT.length === 0) {
    console.log("No test results to push. Likely failed on before all.");
    return;
  }

  resp = undefined;

  try {
    const resp = await axios.post(
      `https://${params.domain}/index.php?/api/v2/add_results_for_cases/${runId}`,
      {
        "results": resultsForIT
      },
      {
        auth: {
          username: params.username,
          password: params.apiToken,
        },
      },
    )
    .then(function (response){

    })
    .catch(function (error) {
      console.log(error);
    });
  } catch (err) { 
      // Handle Error Here
      console.error(err);
  }
};

const updateTestRun = async () => {
  try {
      const resp = await axios.post(
        `https://${params.domain}/index.php?/api/v2/update_run/${runId}`,
        {
          "case_ids": testCasesIDs,
        },
    
        {
          auth: {
            username: params.username,
            password: params.apiToken,
          },
        },
      )
  } catch (err) {
      console.error(err);
  }
};

const closeTestRun = async () => {
  await axios.post(
    `https://${params.domain}/index.php?/api/v2/close_run/${runId}`,
    {

    },
    
    {
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: params.username,
        password: params.apiToken,
      },
    })
    .catch(function (error) {
      console.log(error);
    }
  );
}

async function pushResults(testID, status, comment) {
  resp = undefined;
  console.log("Pushing results.");

  try {
    const response = await axios.post(
      `https://${params.domain}/index.php?/api/v2/add_result_for_case/${projectId}/${testID}`,
      {
        status_id: status,
        comment: comment,
      },
      {
        auth: {
          username: params.username,
          password: params.apiToken,
        },
      },
    );
    resp = true;
  } catch (error) {
    console.error(error);
  }
}

module.exports = class TestrailReporter extends WDIOReporter {
  constructor(options) {
    options = Object.assign(options, { stdout: true })
    super(options)
    params = options;
    let date = new Date();
    let month = (date.getMonth() + 1).toString();
    let day = date.getDate().toString();
    let minutes = date.getMinutes().toString();
    this.hookError = null;
    this.hookFailed = false;
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    if (minutes.length < 2) minutes = "0" + minutes;
    let title = params.title == undefined ? `${params.runName} ~ ${date.getFullYear()}.${month}.${day} - ${date.getHours()}:${minutes}` : params.title
    axios.post(
      `https://${params.domain}/index.php?/api/v2/add_run/${params.projectId}`,
      {
        suite_id: params.suiteId,
        name: title,
        include_all: false,
      },
      {
        auth: {
          username: params.username,
          password: params.apiToken,
        },
      },
    )
    .catch(function (error) {
      console.log(error);
    })
      .then((response) => {
        runId = response.data.id
        this.write(`Run "${title}" created with number ${runId}`);
      })
  }

  onSuiteStart(test){
  }

  onTestPass(test) {
      resultsForIT.push(getObject((test.title.split(' '))[0].replace('C', ''), 1, 'This test case is passed'))
      testCasesIDs.push((test.title.split(' '))[0].replace('C', ''))
  }

  onTestFail(test) {
      console.log("Test Failed");
      if (test.error && test.error.type === 'hook'){
        this.hookFailed = true;
        console.log("Setting hookFailed to True in onTestFail");
      }
      resultsForIT.push(getObject((test.title.split(' '))[0].replace('C', ''), 5, `This test case is failed:\n ${test.errors}`))
      testCasesIDs.push((test.title.split(' '))[0].replace('C', ''))
  }

  onTestSkip(test) {
      resultsForIT.push(getObject((test.title.split(' '))[0].replace('C', ''), 4, 'This test case is skipped'))
      testCasesIDs.push((test.title.split(' '))[0].replace('C', ''))
  }

  onSuiteEnd(suiteStats) {
    if (suiteStats.tests == undefined) {
      this.sync(test, true).then(() => {
        if (params.closeRun){
          closeTestRun();
        }
      });
    }
  }

  onRunnerEnd(runnerStats) {
    if (runnerStats.end != undefined) {
      this.sync().then(() => {
        if (params.closeRun){
          closeTestRun();
        }
      });
    }
    this.write('\nThe results are pushed!')
  }

  onHookFail(hook) {
    console.log("onHookFail called");
    console.log(`Hook Fail: ${hook.title}`);
    if (hook.title.includes('"before all" hook')) {
      const failedCaseID = parseInt((hook.parent.tests[0].title.split(' '))[0].replace('C', ''));
      resultsForIT.push(getObject(failedCaseID, 5, `This test case failed in "before all" hook:\n ${hook.error}`));
      testCasesIDs.push(failedCaseID);
      console.log("Failed in before all");
    }
  }

  async sync(test, isSuite = false) {
    if (isSuite) {
      let values = new Object({
        'general': 0,
        'passed': 0,
        'failed': 0,
        'skipped': 0,
        'errors': []
      })
     
      async.each(test.tests, function (logs, callback) {
        switch (logs.state) {
          case 'failed': values.failed = values.failed + 1;
            values.errors.push(`Failed on : ${logs.title} \n ${JSON.stringify(logs.errors, null, 1)}`)
            break;
          case 'passed':
            values.passed = values.passed + 1;
            break;
          case 'skipped': values.skipped = values.skipped + 1;
            break;
        }
        callback()
      })

      if (values.failed != 0) {
        values.general = 5;
      }
      else if (values.passed == 0 && values.skipped != 0) {
        values.general = 4;
      }
      else {
        values.general = 1;
      }
      pushResults((test.fullTitle.split(' '))[0].replace('C', ''), values.general, JSON.stringify(values, null, 1))
    }
    else {
      await updateTestRun()
      await updateTestRunResults()
    }
  };

  get isSynchronised() {
    return resp !== undefined
  }
};
