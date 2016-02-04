Grafana plugin for [Druid](http://druid.io/) real-time OLAP database. 

## Configuration

Add new Druid Datasource with url to Druid broker instance. For example http://druid.internal/druid

## Status

This plugin is experimental.  It's usable but still needs TLC.  In particular, auto-completion for dimension names would really help. It supports timeseries, group by, and topN queries.  For the filters, it supports a list of filters (AND) and negation (NOT) on a single expression.  OR filters are not yet supported.  To completely support all filters, the editor will need to let you build a tree.

An example configuration and dashboard is [here](https://github.com/Quantiply/grafana-druid-wikipedia/).
