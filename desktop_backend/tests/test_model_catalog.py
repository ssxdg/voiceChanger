import tempfile
import unittest
from pathlib import Path

from desktop_backend.model_catalog import build_model_catalog


class ModelCatalogTest(unittest.TestCase):
    def test_build_model_catalog_pairs_pth_models_with_matching_index_files(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project_root = Path(temp_dir)
            weights_dir = project_root / "assets" / "weights"
            index_dir = project_root / "logs" / "demo"
            weights_dir.mkdir(parents=True)
            index_dir.mkdir(parents=True)
            (weights_dir / "demo.pth").write_bytes(b"model")
            (index_dir / "added_IVF_demo_v2.index").write_bytes(b"index")

            catalog = build_model_catalog(project_root)

        self.assertEqual(
            catalog.as_payload(),
            {
                "modelCount": 1,
                "models": [
                    {
                        "name": "demo.pth",
                        "modelPath": str(weights_dir / "demo.pth"),
                        "indexPath": str(index_dir / "added_IVF_demo_v2.index"),
                        "indexReady": True,
                    }
                ],
            },
        )

    def test_build_model_catalog_reports_models_without_index_as_not_ready(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project_root = Path(temp_dir)
            weights_dir = project_root / "assets" / "weights"
            weights_dir.mkdir(parents=True)
            (weights_dir / "solo.pth").write_bytes(b"model")

            catalog = build_model_catalog(project_root)

        self.assertEqual(catalog.as_payload()["modelCount"], 1)
        self.assertEqual(catalog.as_payload()["models"][0]["name"], "solo.pth")
        self.assertEqual(catalog.as_payload()["models"][0]["indexPath"], "")
        self.assertFalse(catalog.as_payload()["models"][0]["indexReady"])


if __name__ == "__main__":
    unittest.main()
