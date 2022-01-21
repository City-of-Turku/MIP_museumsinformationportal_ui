/*
 * RAK puolen korien listaus controller. Korit välilehden avaus.
 */
angular.module('mip.kori').controller('RakKoriListController', [
		'$scope', '$controller',
		function($scope,  $controller) {
			
			var vm = this;
			
            /**
             * Setup-metodi.
             */
            vm.setUp = function() {
            	
            	// Logiikka löytyy pääluokasta KoriListController
            	angular.extend(this, $controller('KoriListController', {$scope: $scope}));
            	
            	vm.asetaMip('RAK');
            	
	             // Tabin asetus
	             vm.updateTabs('common.Building_inventory', 'common.Carts');
							 
							 vm.showQRCodeButton = false;
            };  
            vm.setUp();

		}
]);
