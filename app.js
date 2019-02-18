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

chatApp.controller("roomController", ["$scope", "$cookies", "$timeout", "$firebaseArray", "firebaseDatabase", "$routeParams", "$q", "modalService", "$http", function($scope, $cookies, $timeout, $firebaseArray, firebaseDatabase, $routeParams, $q, modalService, $http) {
    $scope.email = $cookies.get("email");
    
    firebaseDatabase.getData($routeParams.number)
    .then(function(data) {
        $scope.firebaseData = data;
    })
    
    $scope.finishedRenderingData = function() {
        var objDiv = document.getElementById("messages-container");
        objDiv.scrollTop = objDiv.scrollHeight;
    }
    
    $scope.sendMessage = function() {
        var promise = firebaseDatabase.sendData($routeParams.number, $scope.email, $('.mycontenteditable').html(), $scope.downloadImageURL, $scope.downloadFileURL)
        $('.mycontenteditable').empty();
        resetUploadImage();
        resetUploadFile();
        
        promise.then(function() {
            var objDiv = document.getElementById("messages-container");
            objDiv.scrollTop = objDiv.scrollHeight;
        });
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
    
    //Upload image by adding url
    var resetUploadImage = function() {
        $scope.uploadImageButton = "Upload image";
        $scope.uploadImageStatus = "";
        $scope.downloadImageURL = "";
    }
    resetUploadImage();
    $scope.uploadImage = function(id) {
        resetUploadImage();
        
        $http({
          method: 'GET',
          url: $scope.uploadImageURL, //type is String
          responseType: 'arraybuffer'
        }).then(function successCallback(response) {
            // this callback will be called asynchronously
            // when the response is available
            var blob = new Blob([response.data], {type: 'image/jpeg'});
            //second argument of the following File() constructor specifies the name of the file
            var fileOfBlob = new File([blob], $scope.uploadImageURL.substring($scope.uploadImageURL.lastIndexOf('/')+1));
            
            var folderInFirebaseStorage = "/images/"        
            var promise = firebaseDatabase.uploadFile(fileOfBlob, folderInFirebaseStorage);
            promise.then(function(greeting) {
                //from deferred.resolve("message");
                $scope.downloadImageURL = greeting;
                $scope.uploadImageButton = "Image added to the message.";
                $scope.uploadImageStatus = "Image added to the message.";
                modalService.Close(id);
            }, function(reason) {
                //from deferred.reject("message");
                $scope.uploadImageStatus = reason;
            }, function(update) {
                //from deferred.notify("message");
                $scope.uploadImageStatus = update;
            });
            
          }, function errorCallback(response) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
            console.log("Error: ", response)
          });
        
        
    }
    
    //Upload file from local storage
    var resetUploadFile = function() {
        $scope.uploadFileButton = "Upload file";
        $scope.uploadFileStatus = "";
        $scope.downloadFileURL = "";
    }
    resetUploadFile();
    $scope.uploadFile = function(id) {
        resetUploadFile();
        var selectedFile = $("#upload-file")[0].files[0]
        if (selectedFile.size > 52428800) {
            $scope.uploadFileStatus = "Please choose a different file. The maximum size is 50 MB.";
            return
        }
        
        var folderInFirebaseStorage = "/files/"        
        var promise = firebaseDatabase.uploadFile(selectedFile, folderInFirebaseStorage);
        promise.then(function(greeting) {
            //from deferred.resolve("message");
            $scope.downloadFileURL = greeting;
            $scope.uploadFileButton = "File added to the message.";
            $scope.uploadFileStatus = "File added to the message.";
            modalService.Close(id);
        }, function(reason) {
            //from deferred.reject("message");
            $scope.uploadFileStatus = reason;
        }, function(update) {
            //from deferred.notify("message");
            $scope.uploadFileStatus = update;
        });
    }
    
    //Code for adding a link of the youtube video to the message
    $scope.youtubeVideoURL = "";
    $scope.addYoutubeVideoButton = "Add the link to Youtube";
    
    //check if the string contains the substring "youtube" or "youtu.be" (and report during submition of the form if not)
    $scope.$watch('youtubeVideoURL',function(newVal,oldVal){
        if ($scope.youtubeVideoURL === "") {
            return;
        }
        
        if ($scope.youtubeVideoURL.indexOf("youtube") === -1 && $scope.youtubeVideoURL.indexOf("youtu.be") === -1) {
            document.getElementById("add-youtube-video").setCustomValidity("Sorry, but the link doesn't look like for a youtube video.");
        } else {
            document.getElementById("add-youtube-video").setCustomValidity("");
        }
    });
    
    $scope.addYoutubeVideo = function(id) {
        document.getElementById("add-youtube-video").setCustomValidity("");
        if ($scope.youtubeVideoURL === "") {
            $scope.addYoutubeVideoButton = "Add the link to Youtube";
            modalService.Close(id);
        } else {
            $scope.addYoutubeVideoButton = "Youtube video added!";
            modalService.Close(id);
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
    
    this.sendData = function(indexOfTheRoom, email, message, downloadImageURL, downloadFileURL) {
        var deferred = $q.defer();
        
        firebaseData.$loaded()
            .then(function(x) {
                indexOfTheRoom = parseInt(indexOfTheRoom, 10)
                var messages = firebaseData[indexOfTheRoom]
                messages[messages.length] = {
                    timestamp: new Date().valueOf(),
                    value: message,
                    email: email,
                    downloadImageURL: downloadImageURL,
                    downloadFileURL: downloadFileURL
                }
                firebaseData.$save(indexOfTheRoom)
                    .then(function(ref) {
                        //Do something
                        deferred.resolve();
                    })
                    .catch(function(error) {
                        console.log("Error:", error)
                    });
            })
            .catch(function(error) {
                console.log("Error:", error);
            });
        return deferred.promise;
    }
    
    this.uploadFile = function(selectedFile, folderInFirebaseStorage) {        
        var deferred = $q.defer();
        
        if(selectedFile === undefined) {
            console.log("Select the file, please.")
        } else {
            var filename = new Date().valueOf().toString() + "_" + selectedFile.name;
            var storageRef = firebase.storage().ref(folderInFirebaseStorage + filename);

            var uploadTask = storageRef.put(selectedFile);

            // Register three observers:
            // 1. 'state_changed' observer, called any time the state changes
            // 2. Error observer, called on failure
            // 3. Completion observer, called on successful completion
            uploadTask.on('state_changed', function(snapshot){
              // Observe state change events such as progress, pause, and resume
              // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
              var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              deferred.notify('Upload is ' + progress + '% done');
              switch (snapshot.state) {
                case firebase.storage.TaskState.PAUSED: // or 'paused'
                      deferred.notify('Upload is paused');
                  break;
                case firebase.storage.TaskState.RUNNING: // or 'running'
                      deferred.notify('Upload is running');
                  break;
              }
            }, function(error) {
              // Handle unsuccessful uploads
              deferred.reject('Error:, ', error);
            }, function() {
              // Handle successful uploads on complete
              // For instance, get the download URL: https://firebasestorage.googleapis.com/...
              uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
                  //return the downloadURL where the file is available at
                  deferred.resolve(downloadURL);
              });
            });
        }
        
        return deferred.promise;
    };
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