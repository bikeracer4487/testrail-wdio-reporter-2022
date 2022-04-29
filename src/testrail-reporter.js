"use strict";
/// <reference types="node" />

const WDIOReporter = require("@wdio/reporter").default;
const axios = require('axios');
const async = require('async');
let runId,
  params,
  resp;
let resultsForIT = [];
let testCasesIDs = [];

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
  // console.log("Getting run status.");
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
  resp = undefined;
  // this.write(getTime() + ": Updating Test Run Results");
  // console.log("Updating test run results.");

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
  } catch (err) { 
      // Handle Error Here
      console.error(err);
  }
};

const updateTestRun = async () => {
  // this.write(getTime() + ": Updating test run.");
  // console.log("Updating test run");
  try {
      const resp = await   axios.post(
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
      //console.log(resp.data);
  } catch (err) {
      // Handle Error Here
      console.error(err);
  }
};

const closeTestRun = async () => {
  // this.write(getTime() + ": Closing test run.");
  // console.log("Closing test run.");
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
    .then(function (response) {
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });
  //console.log(resp.data);
}

function pushResults(testID, status, comment) {
  resp = undefined;
  // this.write(getTime() + ": Pushing results.");
  console.log("Pushing results.");

  axios.post(
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
  ).then(function (response) {
    resp = true;
  })

}

module.exports = class TestrailReporter extends WDIOReporter {
  constructor(options) {
    options = Object.assign(options, { stdout: true })
    super(options)
    params = options;
    let date = new Date();
    let month = date.getMonth().toString();
    let day = date.getDate().toString();
    let minutes = date.getMinutes().toString();
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + month;
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
      // handle error
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
      resultsForIT.push(getObject((test.title.split(' '))[0].replace('C', ''), 5, `This test case is failed:\n ${test.errors}`))
      testCasesIDs.push((test.title.split(' '))[0].replace('C', ''))
  }

  onTestSkip(test) {
      resultsForIT.push(getObject((test.title.split(' '))[0].replace('C', ''), 4, 'This test case is skipped'))
      testCasesIDs.push((test.title.split(' '))[0].replace('C', ''))
  }

  onSuiteEnd(suiteStats) {
    if (suiteStats.tests == undefined) {
      this.sync(test, true)
    }
  }

  onRunnerEnd(runnerStats) {
    if (runnerStats.end != undefined) {
      this.sync();
    }
    
    if (params.closeTestRun) {
      closeTestRun();
    }
    /*
    let untested = 1;
    let passed = 0;
    let failed = 0;
    let ran = 0;
    let retries = 0;
    while (untested > 0 || ran == 0){
      // const runStatus = getRunStatus();

      axios.get(
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
      .then(res => {
        // console.log(res.data.untested_count);
        passed = res.data.passed_count;
        failed = res.data.failed_count;
        ran = passed + failed;
        untested = res.data.untested_count;
        if ((untested == 0) && (params.closeRun) && (ran == 0)) {
          console.log("Ran " + ran + ", Untested " + untested);
          params.closeRun = false;
          // closeTestRun();
          console.log("Attempting to close run");
        }
        else if (untested == 0) console.log("Ran " + ran + ", Untested " + untested);
        else console.log("Ran " + ran + ", Untested " + untested);
      })
      .catch(err => console.error(err));

      retries = retries + 1;

      if (retries > 10) untested = 0;
    }
    */
    
    // if (params.closeRun) closeTestRun();
    this.write('\nThe results are pushed!')
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
