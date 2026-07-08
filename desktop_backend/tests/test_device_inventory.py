import unittest

from desktop_backend.device_inventory import build_inventory


class DeviceInventoryTest(unittest.TestCase):
    def test_build_inventory_groups_input_output_and_virtual_output_devices(self):
        raw_devices = [
            {
                "index": 0,
                "name": "Microphone Array",
                "hostapi": 0,
                "max_input_channels": 2,
                "max_output_channels": 0,
            },
            {
                "index": 1,
                "name": "Speakers",
                "hostapi": 0,
                "max_input_channels": 0,
                "max_output_channels": 2,
            },
            {
                "index": 2,
                "name": "CABLE Input",
                "hostapi": 0,
                "max_input_channels": 0,
                "max_output_channels": 2,
            },
            {
                "index": 3,
                "name": "VoiceMeeter Input",
                "hostapi": 1,
                "max_input_channels": 0,
                "max_output_channels": 8,
            },
        ]
        host_apis = [
            {"name": "MME", "devices": [0, 1, 2]},
            {"name": "WASAPI", "devices": [3]},
        ]

        inventory = build_inventory(raw_devices, host_apis)

        self.assertEqual([device.label for device in inventory.input_devices], ["Microphone Array (MME)"])
        self.assertEqual(
            [device.label for device in inventory.output_devices],
            ["Speakers (MME)", "CABLE Input (MME)", "VoiceMeeter Input (WASAPI)"],
        )
        self.assertEqual(
            [device.label for device in inventory.virtual_output_devices],
            ["CABLE Input (MME)", "VoiceMeeter Input (WASAPI)"],
        )

    def test_build_inventory_keeps_unknown_host_api_readable(self):
        inventory = build_inventory(
            [
                {
                    "index": 9,
                    "name": "Unknown Device",
                    "hostapi": 99,
                    "max_input_channels": 1,
                    "max_output_channels": 1,
                }
            ],
            [],
        )

        self.assertEqual(inventory.input_devices[0].label, "Unknown Device (Unknown)")
        self.assertEqual(inventory.output_devices[0].label, "Unknown Device (Unknown)")


if __name__ == "__main__":
    unittest.main()
