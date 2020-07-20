# Summary

## Problem

We want ingredients and pantries to be easy to test. Specifically, it should be
easy to write both unit and functional tests, easy to run those tests, and easy
to obtain coverage data.

This RFC proposes the ingredient interface to support these goals.

## Solution Overview

Ingredients may define a test entry point (`test.js`) that runs the ingredient's
unit and functional tests and reports [TAP](https://testanything.org/) results.
The test harness can be configured to ensure a Roux server is running before
executing the test entry point. If it does so, it will provide the URL for that
server via an environment variable.
The test harness will be able to execute the test entry points of multiple
ingredients and report the aggregate results.

# API

## Test entry point

An ingredient MAY define a test entry point by including a file named `test.js`
in the ingredient root. When invoked, the script must print a [Test Anything
Protocol (TAP)](https://testanything.org/) test stream to `stdout` before
exiting. The script MAY run one or more tests when invoked. The result of any
tests the script runs MUST be printed to the TAP stream. If any test fails, the
script MUST exit with a non-zero exit code. Otherwise, it MUST exit with an exit
code of zero.

The test entry point MAY receive configuration via its `process.argv` and
`process.env` properties.

The test entry point MUST NOT assume a Roux server is running. If a Roux server
is running, the test entry point WILL receive the root URL for its ingredient as
an environment variable named `ROUX_INGREDIENT_URL`.

A test entry point MUST NOT assume that it is the only test entry point
executing. The test harness MAY execute multiple entry points concurrently, so
access to any shared resources MUST be coordinated via other means.
