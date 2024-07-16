"use client";

import Options from "@/components/Options";
import Report from "@/components/Report";
import axios from "axios";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "react-beautiful-dnd-next";
import ClipLoader from "react-spinners/ClipLoader";
import RouteOptions from "@/components/RouteOptions";

import StartAddressOptions from "@/components/StartAddressOptions";
import EndAddressOptions from "@/components/EndAddressOptions";
import { format, formatISO } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Home() {
  const [stops, setStops] = useState([]);
  const [report, setReport] = useState(null);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingStops, setLoadingStops] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [addresses, setAddresses] = useState([
    {
      zip: "K1B3R2",
      name: "Ottawa",
    },

    {
      zip: "L6S6G5",
      name: "Brampton",
    },

    {
      zip: "E1H2S7",
      name: "Moncton",
    },

    {
      zip: "G2E2H2",
      name: "Quebec",
    },
  ]);

  const [selectedStartPoint, setSelectedStartPoint] = useState(null);
  const [selectedEndPoint, setSelectedEndPoint] = useState(null);
  const [isChecked, setIsChecked] = useState(false);

  const [id, setId] = useState("");
  const [date, setDate] = useState(null);

  const [newStop, setNewStop] = useState({
    tripId:
      id && date
        ? `${id}-${formatISO(date, { representation: "date" })}`
        : null,
    customerNum: 0,
    shipToName: "",
    route_seq: "",
    OrderNum: 1,
    address: {
      streetAddress: "",
      city: "",
      state: "",
      zip: "",
      country: "",
    },
  });

  const [avoidTolls, setAvoidTolls] = useState(false);
  const [plannedStartDate, setPlannedStartDate] = useState(null);
  const [isUploaded, setIsUploaded] = useState(true);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [usStops, setUsStops] = useState(null);

  useEffect(() => {
    if (id && date) {
      setNewStop({
        tripId:
          id && date
            ? `${id}-${formatISO(date, { representation: "date" })}`
            : null,
        customerNum: 0,
        shipToName: "",
        route_seq: "",
        OrderNum: 1,
        address: {
          streetAddress: "",
          city: "",
          state: "",
          zip: "",
          country: "",
        },
      });
    }
  }, [id, date]);

  const getStops = async () => {
    setLoadingStops(true);
    setReport(null);
    setStops(null);
    setIsChecked(false);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/rest/routestops/${id}&${formatISO(
          date,
          { representation: "date" }
        )}`
      );
      // Sort stops by route_seq as a number
      const sortedStops = response.data.stopsList.sort(
        (a, b) => parseInt(a.route_seq) - parseInt(b.route_seq)
      );
      const stopsWithOrderNum = sortedStops.map((stop, index) => ({
        ...stop,
        OrderNum: index + 1, // Adding 1 to make the order start from 1
      }));
      setStops(stopsWithOrderNum);
      setLoadingStops(false);
    } catch (error) {
      console.error("Error fetching stops:", error);
      // Handle error
      setLoadingStops(false);
    }
  };

  const getUsStops = async () => {
    setLoadingExport(true);
    setUsStops(null)
    try {
      const res = await axios.get(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/rest/mileageperstate/${id}${formatISO(date, {
          representation: "date",
        })}`
      );
      const data = res.data;
      const usIndex = data.findIndex((item) => item.stCntry === "US");

      if (usIndex !== -1) {
        // Set the usStops from the first item to the item with stCntry "US" inclusive
        setUsStops(data.slice(0, usIndex + 1));
      } else {
        // If no item with stCntry "US" found, set it to null
        setUsStops(null);
      }
      setLoadingExport(false);
    } catch (e) {
      console.log(e);
      setLoadingExport(false);
      setUsStops(null)
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return; // If dropped outside the list, do nothing

    const reorderedStops = Array.from(stops);
    const [movedStop] = reorderedStops.splice(result.source.index, 1);
    reorderedStops.splice(result.destination.index, 0, movedStop);

    // Update the OrderNum property based on the new order
    const stopsWithUpdatedOrder = reorderedStops.map((stop, index) => ({
      ...stop,
      OrderNum: index + 1,
    }));

    setStops(stopsWithUpdatedOrder);
  };

  const generateReports = async () => {
    await generateMap()
    await getUsStops()
  }

  const generateMap = async () => {
    // Clone the stops array and remove the OrderNum property
    setLoadingExport(true);
    setReport(null);
    const modifiedStops = stops.map(({ OrderNum, ...rest }) => rest);

    // Add two additional items at the beginning and end
    modifiedStops.unshift({
      tripId: `${id}-${formatISO(date, { representation: "date" })}`,
      customerNum: -1,
      shipToName: "Start Point",
      route_seq: "-999999999",
      address: {
        streetAddress: null,
        city: null,
        state: null,
        zip: selectedStartPoint,
        country: null,
        countryAbbreviation: null,
      },
      orders: [],
      packCount: 0,
    });

    modifiedStops.push({
      tripId: `${id}-${formatISO(date, { representation: "date" })}`,
      customerNum: 999999999,
      shipToName: "End Point",
      route_seq: "999999999",
      address: {
        streetAddress: null,
        city: null,
        state: null,
        zip: selectedEndPoint,
        country: null,
        countryAbbreviation: null,
      },
      orders: [],
      packCount: 0,
    });

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/rest/maproute`,
        {
          stopsList: modifiedStops,
          avoidTolls: avoidTolls,
          rundate: formatISO(date, { representation: "date" }),
          runid: id,
          routePlannedStartTime: format(
            plannedStartDate,
            "yyyy-MM-dd'T'HH:mm:ss"
          ),
        }
      );
      setReport(response.data);
      setLoadingExport(false);
    } catch (error) {
      console.error("Error generating map:", error);
      setLoadingExport(false);
    }
  };

  const deleteStop = (index) => {
    setStops((prevStops) => {
      // Filter out the stop at the given index
      const newStops = prevStops.filter((stop, i) => i !== index);

      // Update the OrderNum property of the remaining stops
      const updatedStops = newStops.map((stop, i) => ({
        ...stop,
        OrderNum: i + 1, // Assuming OrderNum starts from 1
      }));

      return updatedStops;
    });
  };

  const AddNewStop = async () => {
    const checkZip = async (stop) => {
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/rest/validatepostalcodeformat?sPostalCode=${stop.address.zip}`
        );
        const res = response.data;
        console.log(res);
        return res[0].coords === null || res.error ? true : false;
      } catch (error) {
        return true;
      }
    };

    const unknown = await checkZip(newStop);

    setStops((prevStops) => {
      // Add newStop at the beginning
      const updatedStops = [
        { ...newStop, OrderNum: 1, unknown }, // Assuming OrderNum of newStop is 1 and setting unknown based on validation
        ...prevStops.map((stop) => ({
          ...stop,
          OrderNum: stop.OrderNum + 1, // Increment OrderNum of existing stops
        })),
      ];

      return updatedStops;
    });

    setNewStop({
      tripId:
        id && date
          ? `${id}-${formatISO(date, { representation: "date" })}`
          : null,
      customerNum: 0,
      shipToName: "",
      route_seq: "",
      OrderNum: 1,
      address: {
        streetAddress: "",
        city: "",
        state: "",
        zip: "",
        country: "",
      },
    });
  };

  useEffect(() => {
    if (date) {
      const newDate = new Date(date);
      newDate.setHours(7);
      newDate.setMinutes(30);
      newDate.setSeconds(0); // Set seconds to 0
      const timeString = newDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const [hours, minutes, seconds] = timeString.split(":");
      newDate.setHours(parseInt(hours));
      newDate.setMinutes(parseInt(minutes));
      newDate.setSeconds(parseInt(seconds)); // Set seconds
      setPlannedStartDate(newDate);
    }
  }, [date]);

  useEffect(() => {
    const checkZip = async () => {
      const updatedStopsList = await Promise.all(
        stops.map(async (stop) => {
          if (stop.unknown !== undefined) {
            // If 'unknown' property exists, do nothing
            return stop;
          }

          try {
            const response = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/rest/validatepostalcodeformat?sPostalCode=${stop.address.zip}`
            );

            const res = response.data;

            if (res[0].coords === null || res.error) {
              // Set stop.unknown to true if there's no coordinates or an error
              return { ...stop, unknown: true };
            } else {
              // Set stop.unknown to false if validation is successful
              return { ...stop, unknown: false };
            }
          } catch (error) {
            // In case of a network or other error, set stop.unknown to true
            return { ...stop, unknown: true };
          }
        })
      );

      setStops(updatedStopsList);
      setIsChecked(true);
    };
    if (stops && isChecked === false) checkZip();
  }, [stops, isChecked]);

  useEffect(() => {
    console.log(stops);
  }, [stops]);

  const convertToJsonString = (object) => {
    return JSON.stringify(object, null, 2);
  };

  // Function to create a downloadable file and trigger its download
  const downloadJsonFile = () => {
    const data = { stops, date, id, isUploaded: true };
    const jsonContent = convertToJsonString(data);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "data.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    if (file) {
      // Read the file
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = JSON.parse(e.target.result);
        // Assuming the JSON file contains properties: stops, date, id, isUploaded
        const { stops, date, id, isUploaded } = content;
        // Process the data as needed
        setStops(stops);
        setDate(date);
        setId(id);
        setIsUploaded(isUploaded);
        setLoadingUpload(false);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="wrapper">
      <div className="my-8 grid grid-cols-3 gap-8 border-b pb-6">
        <RouteOptions
          avoidTolls={avoidTolls}
          setAvoidTolls={setAvoidTolls}
          plannedStartDate={plannedStartDate}
          setPlannedStartDate={setPlannedStartDate}
        />
        <StartAddressOptions
          addresses={addresses}
          setAddresses={setAddresses}
          selectedStartPoint={selectedStartPoint}
          setSelectedStartPoint={setSelectedStartPoint}
        />
        <EndAddressOptions
          addresses={addresses}
          setAddresses={setAddresses}
          selectedEndPoint={selectedEndPoint}
          setSelectedEndPoint={setSelectedEndPoint}
        />
      </div>

      <div className="flex gap-2">
        <Input
          className="max-w-[100px]"
          placeholder="Id "
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          disabled={!date || !id || loadingStops}
          onClick={getStops}
          className="bg-blue-700 hover:bg-blue-700/90"
        >
          {loadingStops ? "Importing run ..." : "Import run"}
        </Button>

        <Button onClick={handleUploadClick}>
          {loadingUpload ? "Uploading ..." : "Upload"}
        </Button>

        <input
          type="file"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8">
        {loadingStops ? (
          <div className="h-[600px] flex items-center justify-center">
            <ClipLoader
              size={150}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : stops?.length ? (
          <div>
            <div className="p-2 bg-gray-50">
              <AlertDialog>
                <div className="p-4 mb-2 cursor-pointer flex gap-2">
                  <Plus width={32} height={32} className="text-gray-500" />

                  <AlertDialogTrigger>
                    <div className="text-xl font-semibold text-gray-500">
                      Add new stop
                    </div>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>New Stop</AlertDialogTitle>
                      <AlertDialogDescription>
                        <Input
                          type="number"
                          placeholder="Customer number"
                          className="mt-3 text-black"
                          value={newStop.customerNum}
                          onChange={(e) =>
                            setNewStop({
                              ...newStop,
                              customerNum: Number(e.target.value),
                            })
                          }
                        />

                        <Input
                          type="text"
                          placeholder="Customer name*"
                          className="mt-3 text-black"
                          value={newStop.shipToName}
                          onChange={(e) =>
                            setNewStop({
                              ...newStop,
                              shipToName: e.target.value,
                            })
                          }
                        />

                        <Input
                          type="text"
                          placeholder="Street address"
                          className="mt-3 text-black"
                          value={newStop.address.streetAddress}
                          onChange={(e) =>
                            setNewStop({
                              ...newStop,
                              address: {
                                ...newStop.address,
                                streetAddress: e.target.value,
                              },
                            })
                          }
                        />

                        <Input
                          type="text"
                          placeholder="city"
                          className="mt-3 text-black"
                          value={newStop.address.city}
                          onChange={(e) =>
                            setNewStop({
                              ...newStop,
                              address: {
                                ...newStop.address,
                                city: e.target.value,
                              },
                            })
                          }
                        />

                        <Input
                          type="text"
                          placeholder="state"
                          className="mt-3 text-black"
                          value={newStop.address.state}
                          onChange={(e) =>
                            setNewStop({
                              ...newStop,
                              address: {
                                ...newStop.address,
                                state: e.target.value,
                              },
                            })
                          }
                        />

                        <Input
                          type="text"
                          placeholder="ZIP*"
                          className="mt-3 text-black"
                          value={newStop.address.zip}
                          onChange={(e) =>
                            setNewStop({
                              ...newStop,
                              address: {
                                ...newStop.address,
                                zip: e.target.value,
                              },
                            })
                          }
                        />

                        <Input
                          type="text"
                          placeholder="country"
                          className="mt-3 text-black"
                          value={newStop.address.country}
                          onChange={(e) =>
                            setNewStop({
                              ...newStop,
                              address: {
                                ...newStop.address,
                                country: e.target.value,
                              },
                            })
                          }
                        />

                        <Input
                          type="text"
                          placeholder="Route Seq"
                          className="mt-3 text-black"
                          value={newStop.route_seq}
                          onChange={(e) =>
                            setNewStop({
                              ...newStop,
                              route_seq: e.target.value,
                            })
                          }
                        />
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        onClick={() => {
                          setNewStop({
                            tripId:
                              id && date
                                ? `${id}-${formatISO(date, {
                                    representation: "date",
                                  })}`
                                : null,
                            customerNum: 0,
                            shipToName: "",
                            route_seq: "",
                            OrderNum: 1,
                            address: {
                              streetAddress: "",
                              city: "",
                              state: "",
                              zip: "",
                              country: "",
                            },
                          });
                        }}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={!newStop.address.zip || !newStop.shipToName}
                        onClick={AddNewStop}
                      >
                        Add
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </div>
              </AlertDialog>
              <div className="max-h-[500px] overflow-auto ">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="stops">
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        {stops?.map((stop, index) => (
                          <Draggable
                            key={stop.OrderNum}
                            draggableId={stop.OrderNum}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-4 mb-2 bg-white rounded-lg flex justify-between gap-4 ${
                                  stop.unknown ? "bg-orange-200" : ""
                                }`}
                              >
                                <div>
                                  {stop.OrderNum} {"- "}
                                  {stop.shipToName} {"- "}
                                  {stop.address?.zip}- Unknown:{" "}
                                  {stop.unknown === true
                                    ? "Yes"
                                    : stop.unknown === false
                                    ? "No"
                                    : "not defined"}
                                </div>

                                <Trash2
                                  width={24}
                                  height={24}
                                  className="text-red-500 cursor-pointer"
                                  onClick={() => deleteStop(index)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
            <div className="flex gap-4">
              {!selectedEndPoint || !selectedStartPoint ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        className="bg-green-800 hover:bg-green-800/90 my-4"
                        onClick={generateReports}
                        disabled={
                          loadingExport ||
                          !selectedEndPoint ||
                          !selectedStartPoint
                        }
                      >
                        {!loadingExport ? "Calculate" : "Calculating ..."}
                      </Button>
                      <TooltipContent>
                        Please fill the start and the end point
                      </TooltipContent>
                    </TooltipTrigger>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  className="bg-green-800 hover:bg-green-800/90 my-4"
                  onClick={generateReports}
                  disabled={
                    loadingExport || !selectedEndPoint || !selectedStartPoint
                  }
                >
                  {!loadingExport ? "Calculate" : "Calculating ..."}
                </Button>
              )}

              {stops?.length ? (
                <Button onClick={downloadJsonFile} className="my-4">
                  Save stops
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div>
          {loadingExport ? (
            <div className="flex items-center justify-center h-full">
              <ClipLoader
                size={150}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
            </div>
          ) : report ? (
            <Report report={report} usReport={usStops}/>
          ) : !report && stops?.length ? (
            <div className="flex items-center justify-center h-full">
              No report yet!
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
