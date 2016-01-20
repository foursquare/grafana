define([
  'angular',
  'lodash',
  './directives',
  './query_ctrl',
],
function (angular, _) {
  'use strict';

  var module = angular.module('grafana.services');

  module.factory('JsonDatasource', ['$q', '$http', 'backendSrv', 'templateSrv', function($q, $http, backendSrv, templateSrv) {
    function JsonDatasource(datasource) {
      this.name = datasource.name;
      this.url = datasource.url;
      this.basicAuth = datasource.basicAuth;
      this.withCredentials = datasource.withCredentials;

      this.path = datasource.jsonData.jsonPath;
      this.method = datasource.jsonData.jsonMethod;
      this.timeFormat = datasource.jsonData.jsonTimeFormat;
      this.templateVars = datasource.jsonData.jsonTemplateVars;
    }

    JsonDatasource.prototype._request = function(options) {
      options.url = this.url + options.url;
      options.method = options.method || 'GET';
      options.inspect = { 'type': 'json_datasource' };

      if (this.basicAuth) {
        options.withCredentials = true;
        options.headers = {
          "Authorization": this.basicAuth
        };
      }

      return backendSrv.datasourceRequest(options);
    };

    JsonDatasource.prototype.convertTimeValue = function(when, whenType) {
      if (whenType === 'epoch_ms') {
        return Math.round(when.valueOf());
      } else if (whenType === 'epoch_seconds') {
        return Math.round(when.valueOf() / 1000.0);
      } else if (whenType === 'iso8601') {
        return when.toJSON();
      } else {
        throw "Unknown time conversion type: " + whenType;
      }
    };

    // Query for metric targets within the specified time range.
    // Returns the promise of a result dictionary. See the convertResponse comment
    // for specifics of the result dictionary.
    JsonDatasource.prototype.query = function(queryOptions) {
      var self = this;

      var targetPromises = _(queryOptions.targets)
        .filter(function(target) { return !target.hide; })
        .map(function(target) {
          var context = {
            from: {value: self.convertTimeValue(queryOptions.range.from, self.timeFormat)},
            to: {value: self.convertTimeValue(queryOptions.range.to, self.timeFormat)},
          };
          _.each(self.templateVars, function(templateVar) {
            context[templateVar.name] = {value: target.jsonTemplateVars[templateVar.name]};
          });

          var options = {
            url: templateSrv.replace(self.path, context),
            method: self.method || 'GET',
          };

          return self._request(options);
        })
        .value();

      return $q.all(targetPromises).then(function(responses) {
        var result = {data: []};
        _.each(responses, function(response) {
          _.each(response.data.data, function(timeseries) {
            result.data.push(timeseries);
          });
        });

        return result;
      });
    };

    return JsonDatasource;
  }]);
});
