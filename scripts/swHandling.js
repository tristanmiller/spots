		if(navigator.serviceWorker){
			navigator.serviceWorker.register('service-worker.js').then(function(reg){
				//if content is being served via network, don't worry, already has latest version
				if(!navigator.serviceWorker.controller) {
					console.log(navigator.serviceWorker.controller);
					return;
				}
				
				//if an updated service worker becomes installed...
				navigator.serviceWorker.addEventListener('controllerchange', function(){
					window.location.reload();	
				});
				
				//if there's an updated service worker waiting...
				if(reg.waiting){
					updateReady(reg.waiting);
				}
				
				//if there's an updated service worker installing, track progress. When installed, call updateReady()
				if(reg.installing){
					trackInstalling(reg.installing);
					return;
				}
				
				//otherwise, listen for new installing workers arriving. If one arrives, track progress.
				//If installed, call .updateReady()
				reg.addEventListener('updatefound', function(){
					trackInstalling(reg.installing);
				});
			});
		}
		
		updateReady = function(worker){
			
			if(!document.getElementsByClassName('update')[0].classList.contains('show')){
				document.getElementsByClassName('update')[0].classList.toggle('show');
			}
			
			let updateButton = document.getElementById('updateBtn');
			//add event listener on this button
			updateButton.addEventListener('click', function(){
				//instructions for the update process for the worker
				worker.postMessage({action: 'skipWaiting'});
			});
		}
		
		trackInstalling = function(worker){
			worker.addEventListener('statechange', function(){
				if(worker.state == 'installed'){
					updateReady(worker);
				}
			})
		}