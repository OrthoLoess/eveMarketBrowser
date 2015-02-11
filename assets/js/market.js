var app = angular.module('marketBrowser', ['ngCookies']);

app.directive('doLogin', ['$rootScope', function($rootScope){
    return {
        restrict: 'E',
        templateUrl: '/templates/do-login.html',
        controller: ['ssoLogin', function(ssoLogin){
            this.login = function(){
                ssoLogin.login();
            };
            this.isLoggedIn = function(){
                $rootScope.loggedIn = ssoLogin.checkLogin();
                $rootScope.test = "Bob";
                return $rootScope.loggedIn;
            };
        }],
        controllerAs: 'doLogin'
    };
}]);
app.directive('typeList', [function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/type-list.html',
        controller: ['crest', '$scope', function(crest, $scope){
            if(!$scope.loggedIn){
                return;
            }
            var browser = this;
            this.types = [];
            this.findChildrenOf = function(parent, data){
                var children = [];
                var i;
                if(parent === null){
                    for (i = 0; i < data.length; i++){
                        if (!data[i].hasOwnProperty('parentGroup')){
                            children.push(data[i]);
                        }
                    }
                } else {
                    for (i = 0; i < data.length; i++){
                        if (data[i].parentGroup.href === parent.href){
                            children.push(data[i]);
                        }
                    }
                }
                return children;
            };
            $scope.hasChildren = function(parent){
                var groups = browser.types;
                for(var i = 0; i < groups.length; i++){
                    if(groups[i].hasOwnProperty('parentGroup') && groups[i].parentGroup.href === parent.href){
                        return true;
                    }
                }
                return false;
            };

            //browser.types = [];
            crest.getEndpoints().then(function(endpoints){
                //browser.types = endpoints;

                crest.walkLink(endpoints.marketGroups.href).then(function(groups){
                    browser.types = groups.items;//browser.findChildrenOf(null ,groups.items);
                });
            });
            //this.test = crest.getSSO();

            //this.types = [];


            /*$http.get('https://public-crest.eveonline.com/market/groups/').success(function(data){
                for (var i= 0; i < data.items.length; i++){
                    if (!data.items[i].hasOwnProperty('parentGroup')){
                        browser.types.push(data.items[i]);
                    }
                }
            });*/
        }],
        controllerAs: 'typeList'
    };
}]);

app.service('crest', ["ssoLogin", "$http", "$q", "$rootScope",
                      function(ssoLogin, $http, $q, $rootScope)
{
    var crestService = this;
    var acceptHeaders = {
        'https://crest-tq.eveonline.com/': 'application/vnd.ccp.eve.Api-v3+json',
        'https://crest-tq.eveonline.com/regions/': 'application/vnd.ccp.eve.RegionCollection-v1+json',
        'https://crest-tq.eveonline.com/market/types/': 'application/vnd.ccp.eve.MarketTypeCollection-v1+json',
        'https://crest-tq.eveonline.com/market/groups/': 'application/vnd.ccp.eve.MarketGroupCollection-v1+json'
    };
    var crestRoot = "https://crest-tq.eveonline.com/"; //"https://public-crest.eveonline.com/"
    this.endpoints = null;
    //this.regionList = null;
    //this.typeList = null;

    this.getEndpoints = function(){
        if(this.endpoints === null) {
            this.endpoints = {'crestEndpoint': {'href': crestRoot}};
            return this.makeRequest('crestEndpoint').then(function(result){
                crestService.endpoints = result;
                return crestService.endpoints;
            });
        } else {
            return $q.when(this.endpoints);
        }
    };
    this.makeRequest = function(endpoint){
        var deferred = $q.defer();
        $http({
            url: crestService.endpoints[endpoint].href,
            method: 'GET',
            headers: {
                'Accept': acceptHeaders[crestService.endpoints[endpoint]],
                'Authorization': "Bearer " + ssoLogin.getAuthToken()
            },
            cache: true
        }).success(function(data) {
            deferred.resolve(data);
        });
        $rootScope.$broadcast('doneLoadingCrest');
        return deferred.promise;
    };
    this.walkLink = function(url){
        var acceptHeader;
        var deferred = $q.defer();
        for(var key in acceptHeaders){
            if(acceptHeaders.hasOwnProperty(key) &&
                (key !== crestRoot) &&
                (url.indexOf(key) >= 0))
            {
                acceptHeader = acceptHeaders[key];
            }
        }
        $http({
            url: url,
            method: 'GET',
            headers: {
                'Accept': acceptHeader,
                'Authorization': "Bearer " + ssoLogin.getAuthToken()
            },
            cache: true
        }).success(function(data) {
            deferred.resolve(data);
        });
        return deferred.promise;
    };
}]);

app.service('ssoLogin', ['$http', '$location', '$window', "$cookies", function($http, $location, $window, $cookies){
    this.appID = '9eb22daedab143c5a9a31bf63b72da9d';
    this.callbackURL = "http://localhost:8000/";
    this.ssoAuthEndpoint = "https://login.eveonline.com/oauth/authorize";
    this.stateTokenName = this.appID + "stateToken";
    this.scopes = "publicData";
    this.authToken = "";

    this.getAuthToken = function(){
        if(this.checkLogin()){
            return this.authToken;
        } else {
            return false;
        }
    };
    this.checkLogin = function() {
        if (this.authToken !== ""){
            return true;
        }
        var queryParams = this.extractQuery($window.location.hash);
        if (queryParams.hasOwnProperty('access_token')) {
            this.authToken = queryParams['access_token'];
            if (this.checkCookie(queryParams.state)) {
                $window.location.hash = "";
                this.removeStateCookie();
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    };
    this.login = function() {
        $window.location.href = this.ssoAuthEndpoint +
                                "?response_type=token" +
                                "&client_id=" + this.appID +
                                "&scope=" + this.scopes +
                                "&redirect_uri=" + this.callbackURL +
                                "&state=" + this.makeStateCookie();
    };
    this.uuidGen = function(){
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    };
    this.extractQuery = function(query){
        var temp;
        var array = query.substring(2).split('&');
        var params = {};
        for(var i = 0; i < array.length; i++){
            temp = array[i].split('=');
            params[temp[0]] = (temp.length > 1)?temp[1]:"";
        }
        return params;
    };
    this.makeStateCookie = function(){
        var state = this.uuidGen();
        $cookies[this.stateTokenName] = state;
        return state;
    };
    this.removeStateCookie = function(){
        $cookies[this.stateTokenName] = undefined;
        return true;
    };
    this.checkCookie = function(state){
        return (state === $cookies[this.stateTokenName]);
    };
}]);

app.filter('groupsFilter', function(){
    return function(groups, parent){
        var children = [];
        var i;
        if(parent === null){
            for(i = 0; i < groups.length; i++){
                if(!groups[i].hasOwnProperty('parentGroup')){
                    children.push(groups[i]);
                }
            }
        } else {
            for(i = 0; i < groups.length; i++){
                if(groups[i].hasOwnProperty('parentGroup') && groups[i].parentGroup.href === parent.href){
                    children.push(groups[i]);
                }
            }
        }
        return children;
    };
});
