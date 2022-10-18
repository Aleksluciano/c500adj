/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
/*eslint-env node, es6 */
"use strict";
var express = require("express");

function pad(n) {
	return n < 10 ? '0' + n : n;
}

module.exports = () => {
	var app = express.Router();

	//HANA DB Client 
	app.post("/", async(req, res) => {

		const {
			company,
			branch,
			branch2,
			period,
			simulation
		} = req.body;
		const period1 = period.slice(6) + period.slice(3, 5) + '01';
		const newdate = new Date(period.slice(6), Number(period.slice(3, 5)) + 1, 0);
		const period2 = period.slice(6) + period.slice(3, 5) + newdate.getDate().toString();


		//validações
		if (!company) return res.type("text/plain").status(500).send(`ERROR: Filtro de empresa faltando`);
		if (!branch) return res.type("text/plain").status(500).send(`ERROR: Filtro de filial faltando`);
		if (!branch2) return res.type("text/plain").status(500).send(`ERROR: Filtro de filial faltando`);
		if (period1.slice(4, 6) !== period2.slice(4, 6)) return res.type("text/plain").status(500).send(
			`ERROR: Filtro de data maior que um mês`);

		let client = req.db;

		//QUERIES
		const query_select_v_emp_fed = `select "MANDT_TDF" from "adejo.view::/TMF/V_EMP_FED" WHERE EMPRESA = ? AND EH_MATRIZ = 'X'`;
		const query_select_v_nf_doc =
			`SELECT "MANDT", "NF_ID", "VL_FORN", "NUM_DOC", "EMPRESA", "FILIAL", "COD_MOD", "DT_E_S", "VL_TOTAL_DOCUMENTO" FROM "adejo.view::/TMF/V_NF_DOC" 
WHERE MANDT = ? AND EMPRESA = ? AND FILIAL BETWEEN ? AND ? AND COD_MOD = '06' AND DT_E_S BETWEEN ? AND ?`;
		const query_select_d_nfdoc_cpl = `select "MANDT", "NF_ID", "VL_FORN" from "adejo.table::/TMF/D_NFDOC_CPL" WHERE MANDT = ? AND NF_ID = ?`;
		const query_update_d_nfdodc_cpl = `UPDATE "adejo.table::/TMF/D_NFDOC_CPL" SET VL_FORN = ? WHERE MANDT = ? AND NF_ID = ?`;
		const query_insert_d_nfdoc_cpl = `insert into "adejo.table::/TMF/D_NFDOC_CPL"(MANDT, NF_ID, VL_FORN) values(?, ?, ?)`;
		const query_select_d_nf_doc =
			`SELECT "MANDT", "NF_ID", "VL_FORN", "DT_E_S", "VL_TOTAL_DOCUMENTO", "VL_FORN" FROM "adejo.table::/TMF/D_NF_DOC" 
WHERE MANDT = ? AND NF_ID = ?`;
		const query_update_d_nf_doc = `UPDATE "adejo.table::/TMF/D_NF_DOC" SET VL_FORN = ? WHERE MANDT = ? AND NF_ID = ?`;
		const resultAll = [];
		let item = 0;

		//SQL EXEC
		try {
	
			let v_emp_fed_table = await client.exec(query_select_v_emp_fed, [company]);
			let v_nf_doc_table = await client.exec(query_select_v_nf_doc, [v_emp_fed_table[0].MANDT_TDF, company, branch, branch2, period1, period2]);
			if (simulation === true) {
				for (const v_nf_doc of v_nf_doc_table) {
					if (!v_nf_doc.MANDT || !v_nf_doc.NF_ID || !v_nf_doc.VL_TOTAL_DOCUMENTO) continue;
					const update_d_nfdoc_cpl = {
						MANDT: v_nf_doc.MANDT,
						NF_ID: v_nf_doc.NF_ID,
						NUM_DOC: v_nf_doc.NUM_DOC,
						VL_FORN: v_nf_doc.VL_TOTAL_DOCUMENTO,
						VL_TOTAL_DOCUMENTO: v_nf_doc.VL_TOTAL_DOCUMENTO,
						DT_E_S: v_nf_doc.DT_E_S,
						EMPRESA: v_nf_doc.EMPRESA,
						FILIAL: v_nf_doc.FILIAL
					}
					item++;
					resultAll.push({... {
							item
						},
						...update_d_nfdoc_cpl
					});
				}
			}
			if (simulation === false) {
				for (const v_nf_doc of v_nf_doc_table) {
					if (!v_nf_doc.MANDT || !v_nf_doc.NF_ID || !v_nf_doc.VL_TOTAL_DOCUMENTO) continue;
					let d_nfdoc_cpl_table = await client.exec(query_select_d_nfdoc_cpl, [v_nf_doc.MANDT, v_nf_doc.NF_ID]);
					let d_nf_doc_table = await client.exec(query_select_d_nf_doc, [v_nf_doc.MANDT, v_nf_doc.NF_ID]);

					if (d_nf_doc_table.length > 0) {
						let d_nf_doc_updated = await client.exec(query_update_d_nf_doc, [v_nf_doc.VL_TOTAL_DOCUMENTO, v_nf_doc.MANDT, v_nf_doc.NF_ID]);
					}
					if (d_nfdoc_cpl_table.length > 0) {

						let d_nfdoc_cpl_updated = await client.exec(query_update_d_nfdodc_cpl, [v_nf_doc.VL_TOTAL_DOCUMENTO, v_nf_doc.MANDT, v_nf_doc.NF_ID]);
						if (d_nfdoc_cpl_updated == 1) {
							const update_d_nfdoc_cpl = {
								MANDT: v_nf_doc.MANDT,
								NF_ID: v_nf_doc.NF_ID,
							    NUM_DOC: v_nf_doc.NUM_DOC,
								VL_FORN: v_nf_doc.VL_TOTAL_DOCUMENTO,
								VL_TOTAL_DOCUMENTO: v_nf_doc.VL_TOTAL_DOCUMENTO,
								DT_E_S: v_nf_doc.DT_E_S,
								EMPRESA: v_nf_doc.EMPRESA,
								FILIAL: v_nf_doc.FILIAL
							}
							item++;
							resultAll.push({... {
									item
								},
								...update_d_nfdoc_cpl
							});
						}
					} else {
						let d_nfdoc_cpl_inserted = await client.exec(query_insert_d_nfdoc_cpl, [v_nf_doc.MANDT, v_nf_doc.NF_ID, v_nf_doc.VL_TOTAL_DOCUMENTO]);
						if (d_nfdoc_cpl_inserted == 1) {
							const new_d_nfdoc_cpl = {
								MANDT: v_nf_doc.MANDT,
								NF_ID: v_nf_doc.NF_ID,
								NUM_DOC: v_nf_doc.NUM_DOC,
								VL_FORN: v_nf_doc.VL_TOTAL_DOCUMENTO,
								VL_TOTAL_DOCUMENTO: v_nf_doc.VL_TOTAL_DOCUMENTO,
								DT_E_S: v_nf_doc.DT_E_S,
								EMPRESA: v_nf_doc.EMPRESA,
								FILIAL: v_nf_doc.FILIAL
							}
							item++;
							resultAll.push({... {
									item
								},
								...new_d_nfdoc_cpl
							});
						}
					}
				}
			}
		

			return res.type("application/json").status(200).send({
				result: resultAll
			});

		} catch (err) {
			console.log(err)
			return res.type("text/plain").status(500).send(`ERROR: ${err.toString()}`);
		}

	});

	return app;
};