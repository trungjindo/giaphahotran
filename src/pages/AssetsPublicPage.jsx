import React from 'react';
import AssetManagement from '../components/AssetManagement';

// Trang công khai "Tài sản dòng họ" — danh sách rút gọn, chỉ xem (không cần đăng nhập).
// api/assets.php tự trả về bản đã ẩn tọa độ GPS/địa chỉ/người bảo quản/giá trị cho người
// chưa đăng nhập, nên trang này không cần tự lọc field gì thêm ở phía client.
function AssetsPublicPage() {
  return (
    <div className="container">
      <div className="section-header">
        <span className="section-eyebrow">Dòng Họ Trần Đình</span>
        <h2>Tài Sản Dòng Họ</h2>
        <p>Danh sách rút gọn tài sản chung của họ và các chi — liên hệ ban quản trị để biết thêm chi tiết.</p>
      </div>

      <AssetManagement compact />
    </div>
  );
}

export default AssetsPublicPage;
