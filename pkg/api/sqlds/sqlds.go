package sqlds

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"strings"

	"github.com/grafana/grafana/pkg/log"
	"github.com/grafana/grafana/pkg/middleware"
	m "github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/util"

	_ "github.com/go-sql-driver/mysql"
	"github.com/go-xorm/core"
	"github.com/go-xorm/xorm"
	_ "github.com/lib/pq"
	_ "github.com/mattn/go-sqlite3"
)

type sqlDataRequest struct {
	Query     string `json:"query"`
	From     int64 `json:"from"`
	To       int64 `json:"to"`
	Body       []byte `json:"-"`
}

func getEngine(ds *m.DataSource) (*xorm.Engine, error) {
	dbTypeRaw, ok1 := ds.JsonData["sqlDBType"]
	if !ok1 {
		return nil, errors.New("Cannot deserialize sqlDBType")
	}
	dbType, ok2 := dbTypeRaw.(string)
	if !ok2 {
		return nil, errors.New("Cannot convert sqlDBType")
	}

	hostPortRaw, ok3 := ds.JsonData["sqlHost"]
	if !ok3 {
		return nil, errors.New("Cannot deserialize sqlHost")
	}
	hostPort, ok4 := hostPortRaw.(string)
	if !ok4 {
		return nil, errors.New("Cannot convert sqlHost")
	}

	cnnstr := ""
	switch dbType {
	case "mysql":
		cnnstr = fmt.Sprintf("%s:%s@tcp(%s)/%s?charset=utf8",
			ds.User, ds.Password, hostPort, ds.Database)

	case "postgres":
		var host, port = "127.0.0.1", "5432"
		fields := strings.Split(hostPort, ":")
		if len(fields) > 0 && len(strings.TrimSpace(fields[0])) > 0 {
			host = fields[0]
		}
		if len(fields) > 1 && len(strings.TrimSpace(fields[1])) > 0 {
			port = fields[1]
		}
		cnnstr = fmt.Sprintf("user=%s password=%s host=%s port=%s dbname=%s sslmode=%s",
			ds.User, ds.Password, host, port, ds.Database, "disable")

	default:
		return nil, fmt.Errorf("Unknown database type: %s", dbType)
	}

	return xorm.NewEngine(dbType, cnnstr)
}

func query(db *core.DB, sql string, from int64, to int64) (interface{}, error) {
	rawRows, err := db.Query(sql, from, to)
	if err != nil {
		return nil, err
	}
	defer rawRows.Close()

	rows := make([][]float64, 0)

	var count = 0
	for rawRows.Next() {
		count += 1

		var ts int64
		var value float64
		err = rawRows.Scan(&ts, &value)
		if err != nil {
			return nil, err
		}

		rows = append(rows, []float64{value, float64(ts) * 1000.0})
	}

	log.Info("Found %d rows.", count)

	return rows, nil
}

func HandleRequest(c *middleware.Context, ds *m.DataSource) {
	var req sqlDataRequest
	req.Body, _ = ioutil.ReadAll(c.Req.Request.Body)
	json.Unmarshal(req.Body, &req)

	log.Info("SQL request: query='%v', from=%v, to=%v", req.Query, req.From, req.To)

	engine, err := getEngine(ds)
	if err != nil {
		c.JsonApiErr(500, "Unable to open SQL connection", err)
		return
	}
	defer engine.Close()

	session := engine.NewSession()
	defer session.Close()

	db := session.DB()

	datapoints, err := query(db, req.Query, req.From, req.To)
	if err != nil {
		c.JsonApiErr(500, "Data error", err)
		return
	}

	c.JSON(200, &util.DynMap{
		"target": "foo",
		"datapoints": datapoints,
	})
}
