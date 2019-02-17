var chatApp = angular.module("chatApp", ["ngRoute", "ngCookies", "ngSanitize", "firebase"]);

chatApp.config(function($routeProvider) {
    $routeProvider
    .when("/", {
        templateUrl: "pages/home.htm",
        controller: "homeController"
    })
    .when("/room:number", {
        templateUrl: "pages/room.htm",
        controller: "roomController"
    })
});

chatApp.controller("homeController", ["$scope", "$location", "$cookies", "firebaseDatabase", function($scope, $location, $cookies, firebaseDatabase, modalService) {
    
    $scope.email = $cookies.get("email");
    
    $scope.submitForm = function() {
        $cookies.put("email", $scope.email);
        
        firebaseDatabase.createChatRoom();
        
        
    }
    
}]);

chatApp.controller("roomController", ["$scope", "$cookies", "$timeout", "$firebaseArray", "firebaseDatabase", "$routeParams", "$q", "modalService", function($scope, $cookies, $timeout, $firebaseArray, firebaseDatabase, $routeParams, $q, modalService) {
    $scope.email = $cookies.get("email");
    
    firebaseDatabase.getData($routeParams.number)
    .then(function(data) {
        $scope.firebaseData = data;
    })
    
    $scope.sendMessage = function() {
        firebaseDatabase.sendData($routeParams.number, $scope.email, $('.mycontenteditable').html());
        $('.mycontenteditable').empty();
    };

    $scope.openModal = function(id){
        modalService.Open(id);
    }

    $scope.closeModal = function(id){
        modalService.Close(id);
    }
    
    $scope.$watch('email',function(newVal,oldVal){
        $cookies.put("email", $scope.email);
    });
    
    $scope.richtext = function(command) {    
        if (command == "monospace") {
            document.execCommand("fontName", false, command);
        } else if (command == "defaultfont") {
            //Get the font-family from the body tag, which is set in the css file
            var bodyTag = document.querySelector('body');
            var style = window.getComputedStyle(bodyTag);
            var fontFamily = style.getPropertyValue('font-family');
            
            document.execCommand("fontName", false, fontFamily);
        } else {
            document.execCommand(command, false, null);
        }
    }
}]);

chatApp.service("firebaseDatabase", ["$firebaseArray", "$timeout", "$location", "$q", function($firebaseArray, $timeout, $location, $q) {
    
    // Initialize Firebase
    var config = {
        apiKey: "AIzaSyAOCO2AEUgXF1Ba6p6__PLYk7i0Pck6NwU",
        authDomain: "chat-klient-angularjs.firebaseapp.com",
        databaseURL: "https://chat-klient-angularjs.firebaseio.com",
        projectId: "chat-klient-angularjs",
        storageBucket: "chat-klient-angularjs.appspot.com",
        messagingSenderId: "72966042265"
    };
    
    firebase.initializeApp(config);
    var ref = firebase.database().ref();
    var firebaseData = $firebaseArray(ref)
    
    this.createChatRoom = function() {
        firebaseData.$loaded()
            .then(function(x) {     
                firebaseData.$add([{       
                    timestamp: new Date().valueOf(),
                    value: "Welcome to the new chat."
                }])
                .then(function(subref) {

                    //alternativelly firebaseData.length can be used
                    var idOfTheRoom = subref.key;        
                    var indexOfTheRoom = firebaseData.$indexFor(idOfTheRoom);

                    firebaseData[indexOfTheRoom][1] = {
                        timestamp: new Date().valueOf(),
                        value: "The link to the room is: " + $location.absUrl() + "room" + indexOfTheRoom
                    }

                    firebaseData.$save(indexOfTheRoom).then(function(ref) {
                        $location.path("/room" + indexOfTheRoom);
                    });

                })
            })
            .catch(function(error) {
                console.log("Error:", error);
            })
    };
    
    this.getData = function(indexOfTheRoom) {
        var deferred = $q.defer();
        
        firebaseData.$loaded()
            .then(function(x) {
                deferred.resolve(firebaseData[indexOfTheRoom])            
            })
            .catch(function(error) {
                console.log("Error:", error);
            });
        
        return deferred.promise;
    }
    
    this.sendData = function(indexOfTheRoom, email, message) {
        firebaseData.$loaded()
            .then(function(x) {
                indexOfTheRoom = parseInt(indexOfTheRoom, 10)
                var messages = firebaseData[indexOfTheRoom]
                messages[messages.length] = {
                    timestamp: new Date().valueOf(),
                    value: message,
                    email: email
                }
                firebaseData.$save(indexOfTheRoom)
                    .then(function(ref) {
                        //Do something
                    })
                    .catch(function(error) {
                        console.log("Error:", error)
                    });
            })
            .catch(function(error) {
                console.log("Error:", error);
            });
    }
}])

chatApp.service("modalService", [function() {
    var modals = []; // array of modals on the page
    var service = {};

    service.Add = Add;
    service.Remove = Remove;
    service.Open = Open;
    service.Close = Close;

    return service;

    function Add(modal) {
        // add modal to array of active modals
        modals.push(modal);
    }

    function Remove(id) {
        // remove modal from array of active modals
        var modalToRemove = _.findWhere(modals, { id: id });
        modals = _.without(modals, modalToRemove);
    }

    function Open(id) {
        // open modal specified by id
        var modal = _.findWhere(modals, { id: id });
        modal.open();
    }

    function Close(id) {
        // close modal specified by id
        var modal = _.findWhere(modals, { id: id });
        modal.close();
    }
}])


chatApp.directive("modal", ["modalService", function(modalService){
    return {
        link: function (scope, element, attrs) {
            // ensure id attribute exists
            if (!attrs.id) {
                console.error('modal must have an id');
                return;
            }

            // move element to bottom of page (just before </body>) so it can be displayed above everything else
            element.appendTo('body');

            // close modal on background click
            element.on('click', function (e) {
                var target = $(e.target);
                if (!target.closest('.modal-body').length) {
                    scope.$evalAsync(Close);
                }
            });

            // add self (this modal instance) to the modal service so it's accessible from controllers
            var modal = {
                id: attrs.id,
                open: Open,
                close: Close
            };
            modalService.Add(modal);

            // remove self from modal service when directive is destroyed
            scope.$on('$destroy', function() {
                modalService.Remove(attrs.id);
                element.remove();
            });                

            // open modal
            function Open() {
                element.show();
                $('body').addClass('modal-open');
            }

            // close modal
            function Close() {
                element.hide();
                $('body').removeClass('modal-open');
            }
        }
    };
}])