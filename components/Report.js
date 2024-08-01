import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import jsPDF from "jspdf";
import "jspdf-autotable";

const Report = ({ report, usReport }) => {
  const [reportInfo, setReportInfo] = useState();
  const [usReportInfo, setUsReportInfo] = useState();
  function formatDuration(minutes) {
    // Calculate hours and minutes
    var hours = Math.floor(minutes / 60);
    var remainingMinutes = Math.round(minutes % 60); // Rounding the minutes

    // Ensure that minutes are displayed with two digits
    var formattedMinutes =
      remainingMinutes < 10 ? "0" + remainingMinutes : remainingMinutes;

    // Format the result
    var formattedDuration = hours + "h:" + formattedMinutes + "m";
    return formattedDuration;
  }

  useEffect(() => {
    setReportInfo(`
      Trip Distance: ${report.tripDistance}Km
      Trip Duration: ${formatDuration(report.tripDuration)}
      Hours Driven: ${formatDuration(report.tripDriveDuration)}
      Total Cost: ${report.tripCost.toFixed(2)}
    `);
  }, [report]);

  useEffect(() => {
    if (usReport) {
      const usReportItem = usReport.find(item => item.stCntry === "US");
      setUsReportInfo(`
        Trip Distance: ${usReportItem ? usReportItem.total : "Not found"}
      `);
    }
  }, [usReport]);



  const generatePDF = () => {
    const doc = new jsPDF();

    // Add report info
    doc.text(reportInfo, 10, 10);

    // Calculate the height of the report info

    // Add table below the report info
    doc.autoTable({ html: "#my-table", startY: 45 });

    // Save the PDF
    doc.save("document.pdf");
  };

  const generateUsPdf = () => {
    const doc = new jsPDF();

    // Add report info
    doc.text(usReportInfo, 10, 1);

    // Calculate the height of the report info

    // Add table below the report info
    doc.autoTable({ html: "#usTable", startY: 15 });

    // Save the PDF
    doc.save("documentUs.pdf");
  }

  return (
    <div>
      <div className=" pb-8 mb-4 border-b">
        <div
          id="report-info"
          className="flex gap-x-6 gap-y-2 items-center whitespace-nowrap flex-wrap"
        >
          <div className="flex gap-2 items-center">
            <h6 className="text-lg font-semibold">Trip Distance : </h6>
            <p>{report.tripDistance}Km</p>
          </div>

          <div className="flex gap-2 items-center">
            <h6 className="text-lg font-semibold">Trip Duration : </h6>
            <p>{formatDuration(report.tripDuration)}</p>
          </div>

          <div className="flex gap-2 items-center">
            <h6 className="text-lg font-semibold">Hours Driven : </h6>
            <p>{formatDuration(report.tripDriveDuration)}</p>
          </div>

          <div className="flex gap-2 items-center">
            <h6 className="text-lg font-semibold">Total Cost : </h6>
            <p>{report.tripCost.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <a href={report.url} target="_blank">
            <Button className="bg-green-800 hover:bg-green-800/90">
              View in map
            </Button>
          </a>

          <Button
            onClick={generatePDF}
            className="bg-blue-700 hover:bg-blue-700/90"
          >
            Download
          </Button>

          <Button
            onClick={generateUsPdf}
            className="bg-blue-700 hover:bg-blue-700/90"
          >
            Download Us Report
          </Button>
        </div>
      </div>

      <Table id="my-table">
        <TableCaption>Route Stops.</TableCaption>
        <TableHeader className="whitespace-nowrap">
          <TableRow>
            <TableHead>Stop</TableHead>
            <TableHead>Leg KM</TableHead>
            <TableHead>Total Km</TableHead>
            <TableHead>Leg Cost</TableHead>
            <TableHead>Total Cost</TableHead>
            <TableHead>Leg Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report?.stops?.map((stop, index) => (
            <TableRow
              key={index}
              className={`${
                stop?.stopType === "Origin" ||
                stop?.stopType === "Destination" ||
                stop?.stopType === "Break" ||
                stop?.stopType?.startsWith("RestStop")
                  ? " bg-green-200 hover:bg-green-200/90  text-black"
                  : ""
              }`}
            >
              <TableCell className="font-medium">
                {stop.location.label} {" - "}
                {stop.location.address.zip}
              </TableCell>
              <TableCell>{stop.legDistance}</TableCell>
              <TableCell>{stop.legTotalKm}</TableCell>
              <TableCell>{stop.legCost}</TableCell>
              <TableCell>{stop.legTotalCost}</TableCell>
              <TableCell>{stop.legDriveDuration?.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Table className="hidden" id="usTable">
        <TableHeader className="whitespace-nowrap">
          <TableRow>
            <TableHead>State</TableHead>
            <TableHead>Distance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usReport?.map((stop, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{stop.stCntry}</TableCell>
              <TableCell>{stop.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default Report;
