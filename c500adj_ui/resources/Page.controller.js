sap.ui.define([
	'sap/ui/core/mvc/Controller',
	'sap/ui/model/json/JSONModel',
	'c500adj_ui/myLib/oData',
	'c500adj_ui/myLib/utils',
	'sap/m/MessageToast',
	"sap/m/MessageBox"
], function (Controller, JSONModel, oData, utils, MessageToast, MessageBox) {
	"use strict";

	return Controller.extend("c500adj_ui.Page", {
  
		onPress: function () {
			var dateReg = /^\d{2}([./-])\d{2}\1\d{4}$/;
			var view = this.getView();
			if (oData.SelectedCompany == 0 || oData.SelectedBranch == 0 || oData.SelectedBranch2 == 0) {
				MessageBox.warning("Campo obrigatório sem preenchimento ou inválido");
				return;
			}
			if (oData.SelectedBranch > oData.SelectedBranch2) {
				MessageBox.warning("Valor inicial do range de estabelecimento maior que o final!");
				return;
			}
			if(!oData.SelectedPeriod.match(dateReg)){
				MessageBox.warning("Formato de período incorreto, use o seletor para definir o período");
				return;
			}
			oData.Results = [];
			var oModel = new JSONModel(oData);
			view.setModel(oModel);

			var oDialog = this.byId("BusyDialog");
			oDialog.open();

			var company = utils.find(oData.SelectedCompany, oData.CompanyCollection);
			var branch = utils.find(oData.SelectedBranch, oData.BranchCollection);
			var branch2 = utils.find(oData.SelectedBranch2, oData.BranchCollection2);

			var xhttp = new XMLHttpRequest();
			xhttp.open("POST", "/c500/change", true);
			xhttp.setRequestHeader('content-type', 'application/json');
		
			var content = {
				simulation: oData.Simulation,
				company: company,
				branch: branch,
				branch2: branch2,
				period: oData.SelectedPeriod
			};
			xhttp.send(JSON.stringify(content));
			var msg = '';
			xhttp.onreadystatechange = function () {
				if (this.readyState === 4 && this.status === 200) {
					var response = JSON.parse(this.responseText);
					oDialog.close();
					console.log(response.result);

					if (response.result.length > 0) {
						msg = 'Processado com sucesso!!';
					} else {
						msg = 'Nenhum registro encontrado';
					}

					oData.Results = response.result;
					if (oData.Simulation) {
						oData.StateList = {
							highlight: "Information",
							info: "Simulação"
						};
					} else {
						oData.StateList = {
							highlight: "Success",
							info: "Processado"
						};
					}
					oModel = new JSONModel(oData);
					view.setModel(oModel);
					MessageToast.show(msg);
				} else {
						oDialog.close();
					if (this.status === 401) {
						window.location.reload();
					} else if (this.readyState === 3 && this.status >= 500) {
						MessageBox.error(this.response);
					} 
				}
			};

		},

		changeCompany: function () {
			var allData = this.getView().getModel().getData();

			oData.SelectedBranch = 0;
			oData.SelectedBranch2 = 0;
			oData.BranchCollection = [];
			oData.BranchCollection2 = [];

			oData.BranchCollection = allData.Branchs.filter(function (a) {
				if (a.IdCompany == oData.SelectedCompany || a.Id == 0) {
					return true;
				} else {
					return false;
				}
			});
			oData.BranchCollection2 = oData.BranchCollection;

		}

	});

});