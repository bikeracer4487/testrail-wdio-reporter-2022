
# testrail-wdio-reporter-2022

Create a run on testrail and the update the test cases results
Use test rail API https://www.gurock.com/testrail/docs/api/reference 

The first thing you need is to enable the TestRail API so that report can communicate with TestRail and push the test results.
To do so, log into your TestRail account and go to Administration > Site Settings > API and make sure you click the checkbox near Enable API.

After this, you'll need to create an API key from a user on your Testrail instance, by going to My Settings > API Keys.


## Features

- Webdriver/IO Custom Reporter
- Creates new test run to publish results and can optionally close that test run
- Test run name can be customized and will have date and time appended
- Further features and functionality can be added by editing `..\node_modules\testrail-wdio-reporter-2022\src\testrail-reporter.js` or by forking this project


## Usage/Examples
Add the required options to your WDIO config file

```javascript
const TestrailReporter = require('testrail-wdio-reporter-2022');

    reporters: 
        [[TestrailReporter, {
        projectId: 1,
        suiteId: 1,
        domain: 'xxxxx.testrail.io or com',
        username: 'userEmail',
        apiToken: 'testrail apitoken',
        runName: 'name for the test run' ,
        closeRun: true
    }]],
```


## Configuration
        projectId: ID of the testrail project
        suiteId: ID of the suit, if there is not suits 1 is default 
        domain: your-domain.testrail.com', // no default, required field
        username: 'userEmail', // no default, required field
        apiToken: 'testrail apitoken', // no default, required field
        runName: 'name for the test run'
        closeRun: true/false //required field. True if you want the run to be closed after execution. Otherwise false
