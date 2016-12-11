var app = angular.module("miningCalc", ['ngRoute']);


app.factory('socket', ['$rootScope', function($rootScope) {
  var socket = io.connect("http://144.217.85.254:1235/ETH");
  //var socket = io.connect("http://localhost:1235");

  return {
    on: function(eventName, callback){
      socket.on(eventName, callback);
    },
    emit: function(eventName, data) {
      socket.emit(eventName, data);
    }
  };
}]);


app.controller("data", function data($scope, $http, socket) {
    $scope.autoUpdate = true;
    $scope.autoUpdateString = "On";
    $scope.turnAutoUpdateOff = function() {
        $scope.autoUpdate = false;
    }
    $scope.$watch('autoUpdate', function() {
            if ($scope.autoUpdate) {
                socket.emit('requestInfo');
                $scope.autoUpdateString = "On";
            } else {
                $scope.autoUpdateString = "Off";
            }
        });
    
    
    socket.on('connectionReady', function() {
        //console.log('got connectionReady emitting request');
        socket.emit('requestInfo');
    })
    
    socket.on('profitabilityUpdate', function(data) {
        $scope.$apply(function () {
            if ($scope.autoUpdate) {
                $scope.updateStats(data);
                $scope.computeProfits();
            }
        });
    });
    
    // when the page loads for the first time
    if($scope.search == undefined) {
        $scope.search = "hi";
        $scope.currency = "USD";
        //fetch();
    }
    
    var pendingTask;
    
    // will load results when the string in search box changes
    $scope.change = function() {
        if(pendingTask) {
            clearTimeout(pendingTask);
        }
        pendingTask = setTimeout(fetch, 800);
    };
    $scope.update = function() {
        $scope.search = $scope.others.Search[index].Title;
        $scope.change();
    };
    $scope.select = function() {
        this.setSelectionRange(0, this.value.length);
    }
    $scope.earnings = {};
    $scope.values = [];
    //function that grabs api data from the net
    
    $scope.updateStats = function(data) {
        $scope.priceUSD = data.priceUSD;
        $scope.calculatePrice();
        $scope.difficulty = data.difficulty;
        $scope.difficulty = parseFloat(($scope.difficulty).toFixed(4));
        $scope.blockTime = data.blockTime;
        $scope.blockTime = parseFloat(parseFloat($scope.blockTime).toFixed(2));
        $scope.diffChange = data.diffChange;
        $scope.diffChange = parseFloat(parseFloat($scope.diffChange).toFixed(2));
    }
    
    //this function grabs price data only when the currency is changed
    $scope.getCurrencyRates = function() {
        $http.get("http://coinmarketcap-nexuist.rhcloud.com/api/eth")
        .success(function(response) {
            $scope.currencyRates = {};
            for (var currency in response.price) {
                $scope.currencyRates[currency] = response.price[currency]/response.price.usd;
            }
            $scope.calculatePrice();
         })
    }
    $scope.calculatePrice = function() {
        if ($scope.currency == "USD") {
            $scope.price = $scope.priceUSD;
            $scope.price = parseFloat(parseFloat($scope.price).toFixed(2));
         } else if (typeof $scope.currencyRates === 'undefined') {
             $scope.getCurrencyRates();
             return;
         } else {
             $scope.price = $scope.priceUSD *  $scope.currencyRates[$scope.currency.toLowerCase()];
             $scope.price = parseFloat(parseFloat($scope.price).toFixed(2));
         }
    }
  /*Function that calculates the profits of the user in ethereum.*/
  $scope.computeProfits = function() {  
        if ($scope.userHashSuffix == "MH") {
            $scope.userHashSuffixMult = 1e6;
        } else if ($scope.userHashSuffix == "KH") {
            $scope.userHashSuffixMult = 1e3;
        } else if ($scope.userHashSuffix == "GH") {
            $scope.userHashSuffixMult = 1e9;
        }
        if ($scope.powerSuffix == "W") {
            $scope.userPowerSuffixMult = 0.001;
        } else {
            $scope.userPowerSuffixMult = 1;
        }
        var ETHBlockTargetTime = 14;
        var validBlockRate = ETHBlockTargetTime/$scope.blockTime > 1 ? 1 : ETHBlockTargetTime/$scope.blockTime;
        var secondsPerHour = 3600;
        var ethereumPerBlock = 5;
        //long block of math logic to find the hourly rates of gross earnings, power costs, pool fees, and profit
        $scope.earnings.hourGrossETH = ($scope.userHash/($scope.difficulty*1e12))*ethereumPerBlock*secondsPerHour*$scope.userHashSuffixMult*validBlockRate;
        $scope.values[0] = [$scope.earnings.hourGrossETH];
        $scope.earnings.hourGrossUSD = $scope.earnings.hourGrossETH*$scope.price;
        $scope.values[1] = [$scope.earnings.hourGrossUSD];
        $scope.earnings.powerCostHour = ($scope.wattage*$scope.userPowerSuffixMult*$scope.powerCost)
        $scope.values[2] = [$scope.earnings.powerCostHour];
        $scope.earnings.poolCostHour = ($scope.earnings.hourGrossUSD*($scope.poolFee/100));
        $scope.values[3] = [$scope.earnings.poolCostHour];
        $scope.earnings.profitHour = (($scope.earnings.hourGrossUSD - $scope.earnings.powerCostHour) - $scope.earnings.poolCostHour);
        $scope.values[4] = [$scope.earnings.profitHour];
        //this loop is to create and store all of the profit values as hourly, daily, weekly and monthly
        for (var i = 0; i < $scope.values.length; i++) {
            //earnings/costs per day
            $scope.values[i][1] = $scope.values[i][0] * 24;
            //earnings/costs per week
            $scope.values[i][2] = $scope.values[i][1] * 7;
            //earnings/costs per month
            $scope.values[i][3] = $scope.values[i][1] * 30;
            //earnings/costs per year
            $scope.values[i][4] = $scope.values[i][1] * 365;
        }
        /*conditional that prevents the program from drawing the chart before all the required data has been collected*/
        if (typeof $scope.userHash !== "undefined" && typeof $scope.price !== "undefined" 
        && typeof $scope.difficulty !== "undefined") {
            $scope.drawChart();
        }
  }
    //function responsible for creating chart data and drawing chart
    $scope.drawChart = function(drawNew) {
        var labels = [];
        $scope.profit = [0];
        var rollingDiffFactor = 1;
        var projectedDifficulty = $scope.difficulty;
        for (var i = 0; i <= $scope.timeFrame; i++) {
            labels[i] = i + (i == 1? " Month" : " Months");
            if (i > 0) {
                //profit logic
                $scope.profit[i] = $scope.profit[i-1] + ($scope.values[1][3])*rollingDiffFactor - $scope.values[2][3] - $scope.values[3][3]*rollingDiffFactor;
                $scope.profit[i] =  parseFloat($scope.profit[i].toFixed(2));
                if ($scope.diffChange > 0) {
                    projectedDifficulty += $scope.diffChange;
                } else {
                    projectedDifficulty *= 1 + $scope.diffChange/$scope.difficulty;
                }
                if (projectedDifficulty < 1) {
                    projectedDifficulty = 1;
                }
                rollingDiffFactor = $scope.difficulty/(projectedDifficulty);
            }
        }
        var data = {
                labels: labels,
                datasets: [
            {
                label: "Profit",
                fillColor: "rgba(0,0,0,0.2)",
                strokeColor: "rgba(0,0,0,1)",
                pointColor: "rgba(0,0,0,1)",
                pointStrokeColor: "#fff",
                pointHighlightFill: "#fff",
                pointHighlightStroke: "rgba(151,187,205,1)",
                data: $scope.profit
            }]
        };
        //logic to ensure the tooltips detect radius isn't too large when many points are present
        if ($scope.timeFrame <= 15) {
            var detectRadius = 8;
        } else if ($scope.timeFrame > 15 && $scope.timeFrame <= 23) {
            var detectRadius = 5;
        } else if ($scope.timeFrame > 23 && $scope.timeFrame <= 30) {
            var detectRadius = 3;
        } else {
            var detectRadius = 1;
        }
        var options = {
            pointHitDetectionRadius : detectRadius,
        };
        //Chart.defaults.global.responsive = true;
        //if the chart object doesn't exist yet, OR a complete redraw was called. Create new chart object
        if (typeof $scope.myLineChart == "undefined" || drawNew) {
            ctx = document.getElementById("myChart").getContext("2d");
            $scope.myLineChart = new Chart(ctx).Line(data, options);
        } else {
            for (var i = 0; i < $scope.profit.length;i++) {
                $scope.myLineChart.datasets[0].points[i].value = $scope.profit[i];
            }
            $scope.myLineChart.update();
        }
    }
    //Function that is called when user changes the number of months are to be included in the chart
    //destroys all old chart data then calls the drawChart function to create new data
    $scope.changeAxis = function() {
        $scope.myLineChart.destroy();
        $scope.drawChart(true);
    }
})