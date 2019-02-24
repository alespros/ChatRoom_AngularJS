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

chatApp.controller("roomController", ["$scope", "$cookies", "$timeout", "$firebaseArray", "firebaseDatabase", "$routeParams", "$q", "modalService", "$http", "$sce", function($scope, $cookies, $timeout, $firebaseArray, firebaseDatabase, $routeParams, $q, modalService, $http, $sce) {
    $scope.email = $cookies.get("email");
    
    firebaseDatabase.getData($routeParams.number)
    .then(function(data) {
        $scope.firebaseData = data;
    })

    $scope.trustSrc = function(src) {
        return $sce.trustAsResourceUrl(src);
      };
    
    $scope.finishedRenderingData = function() {
        var objDiv = document.getElementById("messages-container");
        objDiv.scrollTop = objDiv.scrollHeight;
    }
    
    $scope.sendMessage = function() {
        //Add spaces around the message for better understanding whether it starts or ends with the emoticon text
        var message = " " + $('.mycontenteditable').html() + " ";
        
        //Parse the text of the emoticon by the actual emoticons
        Object.keys(emojiMap).forEach(function(key) {
            //Replace only if the text is surrounded by specified signs
            var smartKeysMap = [[" ", " "], [" ", ","], [" ", "."], [" ", "!"], [" ", "?"]];
            smartKeysMap.forEach(function(smartKey, index) {
                while (message.indexOf(smartKeysMap[index][0] + key + smartKeysMap[index][1]) !== -1) {
                    message = message.replace(
                        smartKeysMap[index][0] + key + smartKeysMap[index][1],
                        smartKeysMap[index][0] + emojiMap[key] + smartKeysMap[index][1]);
                }
            })
            
            //Replace if the text of the emoticon is written multiple times after each other
            while (message.indexOf(key + key) !== -1) {
                if (message.indexOf(key + key + key) !== -1) {
                    if (message.indexOf(key + key + key + key) !== -1) {
                        message = message.replace(key+key, emojiMap[key]+emojiMap[key]);
                    } else {
                        message = message.replace(key+key+key, emojiMap[key]+emojiMap[key]+emojiMap[key]);
                    }
                } else {
                    message = message.replace(key+key, emojiMap[key]+emojiMap[key]);
                }
            }
            
            message = message.trim();            
        });

        var promise = firebaseDatabase.sendData($routeParams.number, $scope.email, message, $scope.downloadImageURL, $scope.downloadFileURL, $scope.youtubeVideoURL)
        $('.mycontenteditable').empty();
        resetUploadImage();
        resetUploadFile();
        $scope.youtubeVideoURL = "";
        $scope.addYoutubeVideoButton = "Add the link to Youtube";
        
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
            if ($scope.youtubeVideoURL.indexOf("/embed/") === -1) {
                if ($scope.youtubeVideoURL.indexOf("youtube") !== -1) {
                    var video = $scope.youtubeVideoURL.substring($scope.youtubeVideoURL.indexOf("watch?v=") + 8);
                } else { //else if ($scope.youtubeVideoURL.indexOf("youtu.be") !== -1)
                    var video = $scope.youtubeVideoURL.substring($scope.youtubeVideoURL.lastIndexOf('/')+1)
                }
                $scope.youtubeVideoURL = "https://www.youtube.com/embed/" + video;
            }
            
            $scope.addYoutubeVideoButton = "Youtube video added!";
            modalService.Close(id);
        }
    }
    
    $scope.emojis = ["😃","😅","🤣","😂","🙂","😉","😊","😇","😍","😘","😜","😎","😨","😭"];
    var emojiMap = {
        ":D":"😃",
        ":)":"🙂",
        ";)":"😉",
        ":P":"😜",
    }
    $scope.addEmoji = function(id, emoji) {
        document.execCommand("insertHTML", false, emoji);
        modalService.Close(id);
    }
    
    //Load images as base64
    $scope.imagesBase64 = {};
    $scope.imagesBase64BeingLoaded = false;
    //TODO: Return when no images are present in the messages
    $scope.loadImages = function() {
        if (!confirm("The images will be saved as a text value which can be unsafe, do you wish to continue?")) {
            return;
        }
        
        $scope.imagesBase64BeingLoaded = true;
        var data = $scope.firebaseData;
        var imageData = {};
        var sizeOfImageData = 0;
        var sizeOfImageBase64 = 0;
        
        data.forEach(function(row, index) {
            var url = row["downloadImageURL"];
            
            if (url !== "") {
                imageData[index] = url;
            }
        })
        
        //Get the size of the object which contains all the urls to the images
        for (key in imageData) {
            if (imageData.hasOwnProperty(key)) {
                sizeOfImageData++
            };
        }
        
        for (key in imageData) {        
            $http({
                method: 'GET',
                url: imageData[key],
                responseType: 'arraybuffer',
                key: key
            }).then(function successCallback(response) {
                // this callback will be called asynchronously
                // when the response is available
                var sourceImg = $("#image" + key);
                var width = 100 //sourceImg.width(); //in HTML style="max-width:500px;"
                var height = width * sourceImg.height() / sourceImg.width();

                var blob = new Blob([response.data], {type: 'image/jpeg'});                    
                var reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = function() {
                    var img = new Image();
                    img.src = reader.result;

                    img.onload = () => {
                        var canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        var ctx = canvas.getContext('2d');
                        // img.width and img.height will contain the original dimensions
                        ctx.drawImage(img, 0, 0, width, height);
                        $scope.imagesBase64[response.config.key] = canvas.toDataURL()
                        sizeOfImageBase64++
                        if (sizeOfImageBase64 === sizeOfImageData) {
                            $scope.$apply($scope.imagesBase64BeingLoaded = false)
                        }
                    }
                }
            }, function errorCallback(response) {
                // called asynchronously if an error occurs
                // or server returns response with an error status.
                console.log(response);
            });
        }
    }
    
    //Load files as binary data
    $scope.filesBinary = {};
    $scope.filesBinaryBeingLoaded = false;
    $scope.loadFiles = function() {
        if (!confirm("The files will be saved as a text value which can be unsafe, do you wish to continue?")) {
            return;
        }
        
        $scope.filesBinaryBeingLoaded = true;
        var data = $scope.firebaseData;
        var filesData = {};
        var sizeOfFilesData = 0;
        var sizeOfFilesBinary = 0;
        
        data.forEach(function(row, index) {
            var url = row["downloadFileURL"];
            
            if (url !== "") {
                filesData[index] = url;
            }
        })
        
        //Get the size of the object which contains all the urls to the files
        for (key in filesData) {
            if (filesData.hasOwnProperty(key)) {
                sizeOfFilesData++
            };
        }
        
        for (key in filesData) {        
            $http({
                method: 'GET',
                url: filesData[key],
                responseType: 'arraybuffer',
                key: key
            }).then(function successCallback(response) {
                // this callback will be called asynchronously
                // when the response is available

                var byteArray = new Uint8Array(response.data);
                var arrayAsString = byteArray.join(".");
                
//                //Use this code to get the file back from the String which is saved in the CSV file
//                var stringAsArray = arrayAsString.split(".");
//                var stringAsByteArray = stringAsArray.map(function(elem) {
//                    return parseInt(elem, 10);
//                })
//                var myUnit8Array = new Uint8Array(stringAsByteArray);
//                var newBlob = new Blob([myUnit8Array])
//                
//                var url = window.URL.createObjectURL(newBlob);
//                var a = document.createElement("a");
//                a.setAttribute("hidden", "");
//                a.setAttribute("href", url);
//                //TODO: Get the file extension from the original file instead of setting up the automatic ".txt"
//                a.setAttribute("download", "download." + "txt");
//                document.body.appendChild(a);
//                a.click();
//                document.body.removeChild(a);
                
                $scope.filesBinary[response.config.key] = arrayAsString
                sizeOfFilesBinary++
                if (sizeOfFilesBinary === sizeOfFilesData) {
                    $scope.filesBinaryBeingLoaded = false
                }
            }, function errorCallback(response) {
                // called asynchronously if an error occurs
                // or server returns response with an error status.
                console.log(response);
            });
        }
    }
    
    //Export data based on the configuration which was defined
    $scope.exportData = function(id) {
        var data = $scope.firebaseData;
        var csvRows = [];
        var headers = [];
        var imagesAsBase64 = false;
        var filesAsBinary = false;
        
        //Put the "normal" headers into the first item of the csvRows array
        Object.keys(data[0]).forEach(function(key) {
            if (key.charAt(0) !== "$") {
                headers.push(key)
            }
        })
        csvRows.push('"' + headers.join('","') + '"');
        
        //If the images are loaded as base64, if the $scope.imagesBase64 isn't an empty object
        if (!angular.equals({}, $scope.imagesBase64)) {
            imagesAsBase64 = true;
        }
        
        //If the files are loaded as binary, if the $scope.filesBinary isn't an empty object
        if (!angular.equals({}, $scope.filesBinary)) {
            filesAsBinary = true;
        }
            
        //Based on the headers selected, for every message, take the values of the object and put them as a new item of the csvRows array
        data.forEach(function(message, index) {            
            var values = headers.map(function(header) {
                if (header === "downloadImageURL") {
                    if (imagesAsBase64) {
                        //If the image is present in the message, return its base64 representation
                        if($scope.imagesBase64.hasOwnProperty(index)) {
                            return $scope.imagesBase64[index]
                        }
                    } else {
                        return message[header]
                    }
                } else if (header === "downloadFileURL") {
                    if (filesAsBinary) {
                        //If the file is present in the message, return its binary representation
                        if($scope.filesBinary.hasOwnProperty(index)) {
                            return $scope.filesBinary[index]
                        }
                    } else {
                        return message[header]
                    }
                } else {
                    //Replace " with "", so that they can be shown in the css
                    var escaped = ("" + message[header]).replace(/"/g, '\""');
                    return escaped;
                }                
            });
            csvRows.push('"' + values.join('","') + '"');
        })
        
        csvRows = csvRows.join("\n");
        
        //Create and download the csv file
        var blob = new Blob([csvRows], { type: "text/" + $scope.exportChatFortmat});
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.setAttribute("hidden", "");
        a.setAttribute("href", url);
        a.setAttribute("download", "download." + $scope.exportChatFortmat);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    $scope.exportChatFortmat = "csv"
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
                    //TODO: make the object constructor for it as a similar object is used 3 times
                    timestamp: new Date().valueOf(),
                    value: "Welcome to the new chat.",
                    email: "",
                    downloadImageURL: "",
                    downloadFileURL: "",
                    youtubeVideoURL: ""
                }])
                .then(function(subref) {

                    //alternativelly firebaseData.length can be used
                    var idOfTheRoom = subref.key;        
                    var indexOfTheRoom = firebaseData.$indexFor(idOfTheRoom);

                    firebaseData[indexOfTheRoom][1] = {
                        timestamp: new Date().valueOf(),
                        value: "The link to the room is: " + $location.absUrl() + "room" + indexOfTheRoom,
                        email: "",
                        downloadImageURL: "",
                        downloadFileURL: "",
                        youtubeVideoURL: ""
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
    
    this.sendData = function(indexOfTheRoom, email, message, downloadImageURL, downloadFileURL, youtubeVideoURL) {
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
                    downloadFileURL: downloadFileURL,
                    youtubeVideoURL: youtubeVideoURL
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