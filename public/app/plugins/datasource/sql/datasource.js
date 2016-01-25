define([
  'angular',
  'lodash',
  './directives',
  './query_ctrl',
],
function (angular, _) {
  'use strict';

  var module = angular.module('grafana.services');

  module.factory('SqlDatasource', function($q, backendSrv) {

    function SqlDatasource(datasource) {
      console.log({datasource: datasource});
      this.url = datasource.url;
    }

    SqlDatasource.prototype._request = function(options) {
      options.url = this.url + options.url;
      options.method = options.method || 'GET';
      options.inspect = { 'type': 'generic_sql' };

      return backendSrv.datasourceRequest(options);
    };

    SqlDatasource.prototype.query = function(queryOptions) {
      var self = this;

      var targetPromises = _(queryOptions.targets)
        .filter(function(target) { return target.target && !target.hide; })
        .map(function(target) {
          var requestOptions = {
            url: '/sqldata',
            method: 'POST',
            data: {
              query: target.target,
              from: queryOptions.range.from.unix(),
              to: queryOptions.range.to.unix(),
            }
          };

          return self._request(requestOptions);
        })
        .value();

      return $q.all(targetPromises).then(function(responses) {
        console.log({responses: responses});
        var result = {
          data: _.map(responses, function(response) {
            return response.data;
          })
        };
        result.data = _.flatten(result.data);
        return result;
      });
    };

    console.log({proto: SqlDatasource.prototype});

    return SqlDatasource;
  });

});
