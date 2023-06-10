const mongoose = require("mongoose");
require("./../Models/OrderModel");
require("./../Models/LocationModel");
require("./../Models/DriverModel");

const orderSchema = mongoose.model("order");
const governateSchema=mongoose.model("Governate");
const driverSchema=mongoose.model("driver");

const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/CatchAsync");




// search by location name and return with area id for driver search
exports.assignOrder = async (request, response, next) => {
    
       const id = request.params._id

       const order = await orderSchema.findById(id)

      const governateName = order.Address.Governate
      const cityName = order.Address.City
      const areaName = order.Address.Area

      try {
      const governate = await governateSchema.findOne({ governate: governateName });

      if (!governate) {
        return next(new AppError("Governate not found", 401));
      }
  
      const city = governate.cities.find(c => c.name === cityName);
      if (!city) {
        return next(new AppError("City not found", 401));
      }
  
      const area = city.areas.find(a => a.name === areaName);
      if (!area) {
        return next(new AppError("Area not found", 401));
      }
      const areaID = area._id;
      const driver = await driverSchema.findOne({
        areas: areaID,
        availability: 'free'
      }).limit(1);
      
      
              console.log(typeof(areaID), areaID)
      if (driver) {
        // Update the driver's availability to 'busy'
        if(driver.orderCount==1)
        {
          driver.orderCount=2;
          driver.availability = 'busy';
        }else{
          driver.orderCount +=1
        }
        await driver.save();
    }else{
      return next(new AppError("All driver is busy", 401));
    }
  
      response.json({ driver: driver });
    } catch (error) {
      next(error);
    }
  };

  // exports.getDriversToBeAssignedOrderTo = async (request, response, next) => {
  //   try {
  //       const areaId = request.params.id;
  
  //     // Find one driver with the specified area_id and availability
  //     const driver = await DriverSchema.findOne({ areas: areaId, availability: 'free' }).limit(1);
  
  //     if (driver) {
  //       // Update the driver's availability to 'busy'
  //       if(driver.orderCount==1)
  //       {
  //         driver.orderCount=2;
  //         driver.availability = 'busy';
  //       }
        
       
  //       await driver.save();
  
  //       // Assign the driver_id in the order data
  //       const orderId = request.body.orderId;
  //       const order = await OrderSchema.findById(orderId);
  //       order.DriverID = driver._id;
  //       await order.save();
  
  //       // Return the driver data
  //       response.json(driver);
  //     } else {
  //       response.json({ message: 'No available drivers found' });
  //     }
  //   } catch (error) {
  //     next(error);
  //   }
  // };




  exports.ReAssignedOrderApi = async (request, response, next) => {
    try {
      const thresholdTime = moment().subtract(10, 'minutes');
  
      const filteredOrders = await Order.find({
        status: 'assigned',
        updated_at: { $gt: thresholdTime.toDate() },
      });
  
      filteredOrders.forEach(async (order) => {
        order.status = 'reassigned';
        order.DriverID = null;
       
        await order.save();
      });

      filteredOrders.forEach(async (order) => {
        await exports.assignOrder({ params: { _id: order._id } });
      });
      

  
      console.log('Orders updated successfully:', filteredOrders);
    } catch (error) {
      console.error('Error updating orders:', error);
    }
  };
  
  // Schedule the task to run every 5 minutes (adjust the interval as needed)
  setInterval(exports.ReAssignedOrderApi, 5 * 60 * 1000);

