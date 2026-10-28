import { Questionnaire, SurveyResponse } from "../types";

export function exportSurveyToCSV(survey: Questionnaire, responses: SurveyResponse[]): void {
  const headers = ["提交編號", "提交時間"];
  survey.questions.forEach((q) => {
    headers.push(q.title);
  });

  const rows = responses.map((res) => {
    const rowData = [res.id, res.submittedAt];
    survey.questions.forEach((q) => {
      const answer = res.answers[q.id];
      if (answer === undefined || answer === null) {
        rowData.push("");
      } else if (Array.isArray(answer)) {
        rowData.push(answer.join("; "));
      } else {
        rowData.push(String(answer));
      }
    });
    return rowData;
  });

  // Convert to CSV string, escape commas and quotes
  const csvContent = [
    headers.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","),
    ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
  ].join("\r\n");

  // Traditional Chinese Excel compatibility: prefix with UTF-8 BOM
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${survey.title}_問卷數據_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
