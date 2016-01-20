define([
  'angular',
],
function (angular) {
  'use strict';

  var module = angular.module('grafana.controllers');

  module.controller('JsonQueryCtrl', ['$scope', function($scope) {
    $scope.init = function() {
      if ($scope.target) {
        $scope.target.target = $scope.target.target || '';
        $scope.target.jsonTemplateVars = $scope.target.jsonTemplateVars || {};
      }
    };

    $scope.init();
  }]);
});
