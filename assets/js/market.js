angular.module('marketBrowser', [])
    .directive('typeList', function(){
        return {
            restrict: 'E',
            templateUrl: '/templates/type-list.html',
            controller: ['$http', function($http){
                var browser = this;
                browser.types = [];

                $http.get('https://public-crest.eveonline.com/market/groups/').success(function(data){
                    for (var i= 0; i < data.items.length; i++){
                        if (!data.items[i].hasOwnProperty('parentGroup')){
                            browser.types.push(data.items[i]);
                        }
                    }
                });
            }],
            controllerAs: 'typeList'
        }
    })

;