'use strict';

var fs = require('fs');

var template = fs.readFileSync(__dirname + '/tasks.html', 'utf8');
var series = require('camunda-bpm-sdk-js').utils.series;


var moment = require('moment');
function mockData(opts, done) {
  var data = [];
  var until = opts.start ? moment(opts.start) : moment();
  var count = 100;//Math.round(Math.random() * 100) * 2;
  for (var c = count; c >= 0; c--) {
    data.push({
      timestamp: until.subtract(opts.count, opts.unit).toISOString(),
      value: Math.round(Math.random() * 100)
    });
  }

  setTimeout(function() {
    done(null, data);
  }, 100);
}

module.exports = [
  'ViewsProvider',
  function(
    ViewsProvider
  ) {
    ViewsProvider.registerDefaultView('cockpit.dashboard.section', {
      id: 'tasks',
      label: 'Human Tasks',
      template: template,
      pagePath: '#/tasks',
      checkActive: function(path) {
        return path.indexOf('#/tasks') > -1;
      },
      controller: [
        '$scope',
        'camAPI',
        function(
          $scope,
          camAPI
        ) {
          $scope.sparklineData = [];
          function fetchData(evt, selection) {
            mockData(selection, function(err, data) {
              $scope.$apply(function() {
                $scope.sparklineData = data.map(function(d) {
                  return d.value;
                });
              });
            });
          }
          $scope.$on('stats-time-range-change', fetchData);
          $scope.$on('stats-refresh', fetchData);
          fetchData({}, {
            unit: 'minutes',
            count: 200
          });

          $scope.count = 0;
          $scope.loadingState = 'LOADING';

          $scope.closed = Math.round(Math.random() * 100);

          var HistoryResource = camAPI.resource('history');

          $scope.finishedSearchQuery = function() {
            var searchObject = [{
              type: 'TAfinished',
              operator: 'eq',
              value: '',
              name: ''
            }];

            return encodeURI(JSON.stringify(searchObject));
          };

          series({
            unfinished: function(cb) {
              HistoryResource.taskCount({ unfinished: true }, function(err, data) {
                cb(err, data ? data.count : null);
              });
            },
            finished: function(cb) {
              HistoryResource.taskCount({ finished: true }, function(err, data) {
                cb(err, data ? data.count : null);
              });
            }
          }, function(err, results) {
            if (err) {
              $scope.loadingError = err.message;
              $scope.loadingState = 'ERROR';
              throw err;
            }
            $scope.loadingState = 'LOADED';
            $scope.count = results;
          });
        }],

      priority: 20
    });
  }];
