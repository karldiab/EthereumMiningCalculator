<?php
require_once('../DBCredentials.php');
$credentials = getCredentials();
$db_host = 'localhost';
$db_user = $credentials['db_user'];
$db_pwd = $credentials['db_pwd'];

$database = 'karldiab_coinStats';

$con = mysql_connect($db_host,$db_user,$db_pwd);
if (!$con)
{
die('Could not connect: ' . mysql_error());
}

mysql_select_db($db_user, $con);

/*fetches multiple columns from a table
//$table is the name of table as string
//$columns is a string formatted for SQL query
//ex $columns "cost, total, average" is valid
returns a 2d array, outter array are the columns
inner array are the values
*/
function getColumns($table, $columns) {

    // sending query
    $result = mysql_query("SELECT {$columns} FROM {$table};");
    //echo "</script> SQL query:  SELECT {$columns} FROM {$table}; <script>";
    //$count = mysql_num_rows($result);
    if (!$result) {
        die("Query to show fields from table failed");
    }
    $columnsArray = array();
    while ($row = mysql_fetch_assoc($result)) {
        foreach ($row as $key => $cell) {
            $columnsArray[$key][] = $cell;
        }
    }
    mysql_free_result($result);
    return $columnsArray;
}
function getTable($table) {

    // sending query
    $result = mysql_query("SELECT * FROM {$table};");
    //echo "</script> SQL query:  SELECT {$columns} FROM {$table}; <script>";
    //$count = mysql_num_rows($result);
    if (!$result) {
        die("Query to show fields from table failed");
    }
    $columnsArray = array();
    while ($row = mysql_fetch_assoc($result)) {
        foreach ($row as $key => $cell) {
            $columnsArray[$key][] = $cell;
        }
    }
    mysql_free_result($result);
    return $columnsArray;
}
//$orderby is a columnname that can be used to find the last inserted
//returns a 1d array, the key is column name, value is the value
function getSingleRow($table, $orderby) {

    // sending query
    $result = mysql_query("SELECT * FROM {$table} ORDER BY {$orderby} DESC LIMIT 1");
    //echo "</script> SQL query:  SELECT {$columns} FROM {$table}; <script>";
    //$count = mysql_num_rows($result);
    if (!$result) {
        die("Query to show fields from table failed");
    }
    $columnsArray = array();
    while ($row = mysql_fetch_assoc($result)) {
        foreach ($row as $key => $cell) {
            $columnsArray[$key] = $cell;
        }
    }
    mysql_free_result($result);
    return $columnsArray;
}
//$valuesArray is a 1d array. key is name of column value is value
//$tableName is the source table. function prefixes var names with tablename
function echoJSVars($valuesArray, $tableName) {
    foreach ($valuesArray as $key => $value) {
        echo "var " . $tableName . $key . " = " . $value . ";";
        //echo "console.log('created " . $tableName . $key . " its value = ' + ". $tableName . $key .");";
    }
}
?>