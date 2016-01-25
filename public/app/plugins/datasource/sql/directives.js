define([
  'angular',
],
function (angular) {
  'use strict';

  var module = angular.module('grafana.directives');

  module.directive('metricQueryEditorGenericSql', function() {
    return {controller: 'SqlDatasourceQueryCtrl', templateUrl: 'app/plugins/datasource/sql/partials/query.editor.html'};
  });

});
